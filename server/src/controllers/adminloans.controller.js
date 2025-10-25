// controllers/adminloans.controller.js
import { query as dbQuery, getClient, safeRollback } from '../db/index.js';

// ===================== Helpers de negocio =====================

async function getPeriodForDate(dateISO) {
  const { rows } = await dbQuery(
    `SELECT id, year, name, starts_on, ends_on
     FROM periods
     WHERE $1::date BETWEEN starts_on AND ends_on
     LIMIT 1`,
    [dateISO]
  );
  return rows[0] || null;
}

async function getHolidaysSet(period_id) {
  const { rows } = await dbQuery(
    `SELECT holiday_on::text AS d FROM holidays WHERE period_id = $1`,
    [period_id]
  );
  return new Set(rows.map(r => r.d));
}

function isWeekend(d) {
  const day = d.getUTCDay(); // 0=Dom, 6=Sab
  return day === 0 || day === 6;
}

async function addBusinessDays(baseDateISO, daysToAdd, period_id) {
  if (daysToAdd <= 0) return baseDateISO;
  const holidays = await getHolidaysSet(period_id);

  let d = new Date(baseDateISO + 'T00:00:00Z');
  let added = 0;
  while (added < daysToAdd) {
    d.setUTCDate(d.getUTCDate() + 1);
    const ds = d.toISOString().slice(0, 10);
    if (isWeekend(d)) continue;
    if (holidays.has(ds)) continue;
    added++;
  }
  return d.toISOString().slice(0, 10);
}

async function overdueDays(dueISO, endISO, period_id) {
  if (!dueISO || !endISO) return 0;
  const due = new Date(dueISO + 'T00:00:00Z');
  const end = new Date(endISO + 'T00:00:00Z');
  if (end <= due) return 0;

  const holidays = await getHolidaysSet(period_id);
  let d = new Date(due); d.setUTCDate(d.getUTCDate() + 1);
  let days = 0;
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10);
    if (!holidays.has(ds)) days++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

async function getSettingInt(key, fallback) {
  const { rows } = await dbQuery(`SELECT val FROM settings WHERE key = $1 LIMIT 1`, [key]);
  if (!rows[0]) return fallback;
  const n = parseInt(rows[0].val, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function getAvailableStock(book_id) {
  const { rows } = await dbQuery(
    `SELECT COUNT(*)::int AS active
       FROM loan_items
      WHERE book_id = $1
        AND status IN ('CHECKED_OUT','OVERDUE')`,
    [book_id]
  );
  const active = rows[0]?.active ?? 0;

  const { rows: b } = await dbQuery(`SELECT stock FROM books WHERE id = $1 LIMIT 1`, [book_id]);
  if (!b[0]) throw new Error('Libro no encontrado');
  const stock = b[0].stock ?? 0;

  return Math.max(0, stock - active);
}

async function getActiveItemsCountByPerson(person_id) {
  const { rows } = await dbQuery(
    `SELECT COUNT(*)::int AS c
       FROM loan_items li
       JOIN loans l ON l.id = li.loan_id
      WHERE l.person_id = $1
        AND li.status IN ('CHECKED_OUT','OVERDUE')`,
    [person_id]
  );
  return rows[0]?.c ?? 0;
}

// ===================== Endpoints =====================

export const createLoan = async (req, res) => {
  const client = await getClient();
  try {
    const { person_id, started_at } = req.body;
    if (!person_id) return res.status(400).json({ message: 'person_id requerido' });

    const startISO = (started_at ? new Date(started_at) : new Date()).toISOString().slice(0, 10);

    const { rows: pr } = await client.query(
      `SELECT id, role FROM people WHERE id = $1 LIMIT 1`,
      [person_id]
    );
    if (!pr[0]) return res.status(404).json({ message: 'Persona no encontrada' });

    const period = await getPeriodForDate(startISO);
    if (!period) return res.status(400).json({ message: 'No existe periodo que contenga la fecha de inicio' });

    const studentDays = await getSettingInt('STUDENT_DAYS', 3);

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO loans (person_id, period_id, started_at, due_policy_days, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id, person_id, period_id, started_at, due_policy_days, status`,
      [person_id, period.id, startISO, (pr[0].role === 'STUDENT' ? studentDays : 0)]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await safeRollback(client);
    res.status(500).json({ message: err.message || 'Error al crear préstamo' });
  } finally {
    client.release();
  }
};

export const addLoanItem = async (req, res) => {
  const client = await getClient();
  try {
    const { loanId } = req.params;
    const { book_id, professor_due_on } = req.body;
    if (!book_id) return res.status(400).json({ message: 'book_id requerido' });

    const { rows: lr } = await client.query(
      `SELECT l.id, l.person_id, l.period_id, l.started_at::date AS started_on,
              p.role
         FROM loans l
         JOIN people p ON p.id = l.person_id
        WHERE l.id = $1
        LIMIT 1`,
      [loanId]
    );
    const loan = lr[0];
    if (!loan) return res.status(404).json({ message: 'Préstamo no encontrado' });

    const maxItems = await getSettingInt('MAX_CONCURRENT_ITEMS', 2);
    const activeNow = await getActiveItemsCountByPerson(loan.person_id);
    if (activeNow >= maxItems) {
      return res.status(409).json({ message: `La persona ya tiene ${activeNow} ítems activos (máx ${maxItems})` });
    }

    const available = await getAvailableStock(book_id);
    if (available <= 0) {
      return res.status(409).json({ message: 'No hay stock disponible para este libro' });
    }

    let due_on;
    if (loan.role === 'STUDENT') {
      const studentDays = await getSettingInt('STUDENT_DAYS', 3);
      due_on = await addBusinessDays(loan.started_on, studentDays, loan.period_id);
    } else {
      if (!professor_due_on) {
        return res.status(400).json({ message: 'professor_due_on requerido para profesores' });
      }
      if (new Date(professor_due_on) < new Date(loan.started_on)) {
        return res.status(400).json({ message: 'professor_due_on debe ser >= started_on' });
      }
      due_on = professor_due_on;
    }

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO loan_items (loan_id, book_id, started_on, due_on, status)
       VALUES ($1, $2, $3, $4, 'CHECKED_OUT')
       RETURNING id, loan_id, book_id, started_on, due_on, status, renew_count, fine_cents`,
      [loanId, book_id, loan.started_on, due_on]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await safeRollback(client);
    res.status(500).json({ message: err.message || 'Error al añadir ítem' });
  } finally {
    client.release();
  }
};

export const renewLoanItem = async (req, res) => {
  const client = await getClient();
  try {
    const { loanId, itemId } = req.params;

    const { rows: data } = await client.query(
      `SELECT li.id AS item_id, li.loan_id, li.status, li.renew_count, li.due_on::date AS due_on,
              l.period_id, l.person_id, p.role
         FROM loan_items li
         JOIN loans l ON l.id = li.loan_id
         JOIN people p ON p.id = l.person_id
        WHERE li.id = $1 AND li.loan_id = $2
        LIMIT 1`,
      [itemId, loanId]
    );
    const row = data[0];
    if (!row) return res.status(404).json({ message: 'Ítem no encontrado' });
    if (!['CHECKED_OUT','OVERDUE'].includes(row.status)) {
      return res.status(409).json({ message: 'Solo se puede renovar un ítem activo' });
    }

    if (row.role === 'STUDENT') {
      const maxRenews = await getSettingInt('MAX_RENEWS_STUDENT', 3);
      if (row.renew_count >= maxRenews) {
        return res.status(409).json({ message: `Renovaciones máximas alcanzadas (${maxRenews})` });
      }
      const studentDays = await getSettingInt('STUDENT_DAYS', 3);

      const base = (new Date() > new Date(row.due_on))
        ? new Date().toISOString().slice(0,10)
        : row.due_on;

      const newDue = await addBusinessDays(base, studentDays, row.period_id);

      await client.query('BEGIN');
      const { rows: upd } = await client.query(
        `UPDATE loan_items
            SET renew_count = renew_count + 1,
                due_on = $1,
                status = 'CHECKED_OUT'
          WHERE id = $2
          RETURNING id, loan_id, book_id, started_on, due_on, status, renew_count, fine_cents`,
        [newDue, itemId]
      );
      await client.query('COMMIT');
      return res.json(upd[0]);
    }

    return res.status(400).json({ message: 'Define política de renovación para profesores en un endpoint separado' });
  } catch (err) {
    await safeRollback(client);
    res.status(500).json({ message: err.message || 'Error al renovar' });
  } finally {
    client.release();
  }
};

export const returnLoanItem = async (req, res) => {
  const client = await getClient();
  try {
    const { loanId, itemId } = req.params;
    const returnISO = new Date().toISOString().slice(0,10);
    const dailyFine = await getSettingInt('DAILY_FINE_CENTS', 1200);

    const { rows: data } = await client.query(
      `SELECT li.id AS item_id, li.due_on::date AS due_on, li.status, l.period_id
         FROM loan_items li
         JOIN loans l ON l.id = li.loan_id
        WHERE li.id = $1 AND li.loan_id = $2
        LIMIT 1`,
      [itemId, loanId]
    );
    const row = data[0];
    if (!row) return res.status(404).json({ message: 'Ítem no encontrado' });
    if (!['CHECKED_OUT','OVERDUE'].includes(row.status)) {
      return res.status(409).json({ message: 'Ítem ya devuelto o cerrado' });
    }

    const od = await overdueDays(row.due_on, returnISO, row.period_id);
    const fine_cents = Math.max(0, od * dailyFine);

    await client.query('BEGIN');
    const { rows: upd } = await client.query(
      `UPDATE loan_items
          SET status = 'RETURNED',
              returned_on = $1::date,
              fine_cents = $2
        WHERE id = $3
        RETURNING id, loan_id, book_id, started_on, due_on, returned_on, status, renew_count, fine_cents`,
      [returnISO, fine_cents, itemId]
    );

    await client.query(
      `UPDATE loans
          SET status = CASE
                         WHEN NOT EXISTS (
                           SELECT 1 FROM loan_items
                            WHERE loan_id = $1
                              AND status IN ('CHECKED_OUT','OVERDUE')
                         )
                         THEN 'RETURNED' ELSE status
                       END
        WHERE id = $1`,
      [loanId]
    );

    await client.query('COMMIT');
    res.json(upd[0]);
  } catch (err) {
    await safeRollback(client);
    res.status(500).json({ message: err.message || 'Error al devolver' });
  } finally {
    client.release();
  }
};

// controllers/adminloans.controller.js
export const listLoans = async (req, res) => {
  try {
    const { person_id, period_id, status, page = 1, pageSize = 20 } = req.query;
    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10)));

    const where = [];
    const params = [];
    if (person_id) { params.push(person_id); where.push(`l.person_id = $${params.length}`); }
    if (period_id) { params.push(period_id); where.push(`l.period_id = $${params.length}`); }
    if (status)    { params.push(status);    where.push(`l.status = $${params.length}`); }
    const W = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows: items } = await dbQuery(
      `SELECT l.id, l.person_id, l.period_id,
              l.started_at::date AS started_on,   -- <- clave: solo fecha
              l.status,
              (SELECT COUNT(*) FROM loan_items li WHERE li.loan_id = l.id) AS items_count
         FROM loans l
         ${W}
        ORDER BY l.started_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, ps, (p - 1) * ps]
    );

    const { rows: cnt } = await dbQuery(
      `SELECT COUNT(*)::int AS total FROM loans l ${W}`,
      params
    );

    res.json({ items, meta: { total: cnt[0].total, page: p, pageSize: ps } });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al listar préstamos' });
  }
};


export const booksAvailability = async (_req, res) => {
  try {
    const { rows } = await dbQuery(
      `SELECT b.id, b.title, b.stock,
              COALESCE(a.active_items,0) AS loaned_out,
              (b.stock - COALESCE(a.active_items,0))::int AS available_stock
         FROM books b
    LEFT JOIN (
           SELECT li.book_id, COUNT(*)::int AS active_items
             FROM loan_items li
            WHERE li.status IN ('CHECKED_OUT','OVERDUE')
         GROUP BY li.book_id
       ) a ON a.book_id = b.id
     ORDER BY available_stock ASC, title`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al obtener disponibilidad' });
  }
};

export const reportByGender = async (req, res) => {
  try {
    const { period_id } = req.query;
    const params = [];
    const W = period_id ? (params.push(period_id), `WHERE l.period_id = $1`) : '';
    const { rows } = await dbQuery(
      `SELECT p.year, p.name AS period, pe.sex, COUNT(*)::int AS total_prestamos
         FROM loans l
         JOIN periods p ON p.id = l.period_id
         JOIN people pe ON pe.id = l.person_id
         ${W}
     GROUP BY p.year, p.name, pe.sex
     ORDER BY p.year DESC, p.name, pe.sex`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error en reporte por género' });
  }
};

export const reportFines = async (req, res) => {
  try {
    const { period_id } = req.query;
    const params = [];
    const W = period_id ? (params.push(period_id), `WHERE l.period_id = $1`) : '';
    const { rows } = await dbQuery(
      `SELECT p.year, p.name AS period,
              SUM(li.fine_cents)::decimal/100 AS total_recaudado
         FROM loan_items li
         JOIN loans l ON l.id = li.loan_id
         JOIN periods p ON p.id = l.period_id
         ${W}
        AND li.status = 'RETURNED'
     GROUP BY p.year, p.name
     ORDER BY p.year DESC, p.name`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error en reporte de multas' });
  }
};

export const reportStatus = async (req, res) => {
  try {
    const { period_id } = req.query;
    const params = [];
    const W = period_id ? (params.push(period_id), `WHERE l.period_id = $1`) : '';
    const { rows } = await dbQuery(
      `SELECT p.year, p.name AS period, li.status, COUNT(*)::int AS items
         FROM loan_items li
         JOIN loans l ON l.id = li.loan_id
         JOIN periods p ON p.id = l.period_id
         ${W}
     GROUP BY p.year, p.name, li.status
     ORDER BY p.year DESC, p.name, li.status`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error en reporte por estado' });
  }
};

// --- Careers: listado plano [{ id, name }] ---
export const listCareers = async (_req, res) => {
  try {
    const { rows } = await dbQuery(
      `SELECT id, name
         FROM public.careers
        ORDER BY name ASC`
    );
    res.json(rows); // el frontend espera un arreglo plano
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al listar carreras' });
  }
};


// controllers/adminloans.controller.js
export const createLoanWithItems = async (req, res) => {
  const client = await getClient();
  try {
    const { person_id, started_at, items = [] } = req.body || {};
    if (!person_id) return res.status(400).json({ message: 'person_id requerido' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Debe incluir al menos un ítem' });
    }

    // Normaliza fecha: YYYY-MM-DD
    const startISO = (started_at ? new Date(started_at) : new Date()).toISOString().slice(0, 10);

    // Valida persona + periodo + rol (reusa lógica de createLoan)
    const { rows: pr } = await client.query(
      `SELECT id, role FROM people WHERE id = $1 LIMIT 1`,
      [person_id]
    );
    if (!pr[0]) return res.status(404).json({ message: 'Persona no encontrada' });

    const period = await getPeriodForDate(startISO);
    if (!period) return res.status(400).json({ message: 'No existe periodo que contenga la fecha de inicio' });

    const studentDays = await getSettingInt('STUDENT_DAYS', 3);

    await client.query('BEGIN');

    // 1) Crea loan
    const { rows: loanRows } = await client.query(
      `INSERT INTO loans (person_id, period_id, started_at, due_policy_days, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id, person_id, period_id, started_at, due_policy_days, status`,
       [person_id, period.id, startISO, (pr[0].role === 'STUDENT' ? studentDays : 0)]
    );
    const loan = loanRows[0];

    // 2) Añade ítems con mismas validaciones de addLoanItem
    const maxItems = await getSettingInt('MAX_CONCURRENT_ITEMS', 2);
    const activeNow = await getActiveItemsCountByPerson(person_id);
    if (activeNow + items.length > maxItems) {
      await safeRollback(client);
      return res.status(409).json({ message: `Se excede el máximo permitido (${maxItems})` });
    }

    for (const it of items) {
      const { book_id, professor_due_on } = it || {};
      if (!book_id) throw new Error('book_id requerido');

      const available = await getAvailableStock(book_id);
      if (available <= 0) throw new Error('Sin stock disponible');

      let due_on;
      if (pr[0].role === 'STUDENT') {
        const studentDays2 = await getSettingInt('STUDENT_DAYS', 3);
        due_on = await addBusinessDays(startISO, studentDays2, period.id);
      } else {
        if (!professor_due_on) throw new Error('professor_due_on requerido para profesores');
        if (new Date(professor_due_on) < new Date(startISO)) {
          throw new Error('professor_due_on debe ser >= started_on');
        }
        due_on = professor_due_on;
      }

      await client.query(
        `INSERT INTO loan_items (loan_id, book_id, started_on, due_on, status)
         VALUES ($1, $2, $3, $4, 'CHECKED_OUT')`,
        [loan.id, book_id, startISO, due_on]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(loan);
  } catch (err) {
    await safeRollback(client);
    res.status(500).json({ message: err.message || 'Error al crear préstamo con ítems' });
  } finally {
    client.release();
  }
};


// NUEVO: listar préstamos por ÍTEM con datos de persona, periodo y libro
export const listLoansWithItems = async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query
    const p = Math.max(1, parseInt(page, 10))
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10)))

    // NOTA: paginamos por ítems (loan_items)
    const { rows } = await dbQuery(
      `SELECT
          l.id                            AS loan_id,
          l.started_at::date              AS started_on,
          l.status                        AS loan_status,
          per.id                          AS period_id,
          per.year                        AS period_year,
          per.name                        AS period_name,
          pe.id                           AS person_id,
          pe.full_name                    AS person_name,
          pe.control_number               AS person_control,
          pe.sex                          AS person_sex,
          li.id                           AS item_id,
          li.status                       AS item_status,
          b.title                         AS book_title,
          b.isbn13                        AS book_isbn13,
          b.isbn10                        AS book_isbn10
        FROM loan_items li
        JOIN loans l   ON l.id = li.loan_id
        JOIN people pe ON pe.id = l.person_id
        JOIN periods per ON per.id = l.period_id
        LEFT JOIN books b ON b.id = li.book_id
        ORDER BY l.started_at DESC, li.id DESC
        LIMIT $1 OFFSET $2`,
      [ps, (p - 1) * ps]
    )

    const { rows: cnt } = await dbQuery(
      `SELECT COUNT(*)::int AS total
         FROM loan_items li
         JOIN loans l ON l.id = li.loan_id`,
      []
    )

    res.json({ items: rows, meta: { total: cnt[0].total, page: p, pageSize: ps } })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al listar préstamos (ítems)' })
  }
}
