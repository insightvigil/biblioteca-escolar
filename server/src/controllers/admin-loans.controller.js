// server/src/controllers/admin-loans.controller.js
import { pool } from '../db/pool.js';

/** Utilidades pequeñas **/
const todayISO = () => new Date().toISOString().slice(0,10);

async function inTx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/** ===================== Loans ===================== **/

// === REEMPLAZA COMPLETO createLoan por este ===
export async function createLoan(req, res) {
  const { user_id, period_id, start_date, due_date } = req.body || {};
  if (!user_id || !period_id) {
    return res.status(400).json({ error: 'user_id y period_id son requeridos' });
  }

  try {
    const row = await inTx(async (client) => {
      // validar usuario y role
      const { rows: ur } = await client.query(
        `SELECT role FROM users WHERE id=$1`,
        [user_id]
      );
      if (!ur[0]) throw new Error('user no encontrado');
      const role = ur[0].role; // 'student' | 'professor'

      if (role === 'professor') {
        if (!due_date) throw new Error('due_date es requerido para profesor');
        const { rows } = await client.query(
          `INSERT INTO loans (user_id, period_id, start_date, due_date)
           VALUES ($1,$2, COALESCE($3, CURRENT_DATE), $4)
           RETURNING id, due_date`,
          [user_id, period_id, start_date || null, due_date]
        );
        return rows[0];
      }

      // student: deja que el trigger calcule due_date
      const { rows } = await client.query(
        `INSERT INTO loans (user_id, period_id, start_date)
         VALUES ($1,$2, COALESCE($3, CURRENT_DATE))
         RETURNING id, due_date`,
        [user_id, period_id, start_date || null]
      );
      return rows[0];
    });

    const loanId = row?.id ?? row?.loan_id ?? null;
    if (!loanId) {
      console.error('[createLoan] INSERT retornó inesperado:', row);
      return res.status(500).json({ error: 'No se obtuvo id del préstamo' });
    }

    return res.status(201).json({
      id: loanId,
      loan_id: loanId,        // <- el frontend usa este campo
      due_date: row.due_date,
    });
  } catch (err) {
    console.error('[createLoan]', err);
    return res.status(500).json({ error: err.message || 'createLoan failed' });
  }
}



export async function getLoanHeader(req, res) {
  const loanId = Number(req.params.loanId);
  if (!loanId) return res.status(400).json({ error: 'loanId inválido' });

  try {
    const { rows } = await pool.query(
      `SELECT
         l.id, l.user_id, l.period_id, l.start_date, l.due_date, l.status,
         u.role, u.first_name, u.last_name, u.sex, u.email, u.control_number, u.career_id,
         ap.name AS period_name, ap.date_start, ap.date_end
       FROM loans l
       JOIN users u ON u.id = l.user_id
       JOIN academic_periods ap ON ap.id = l.period_id
       WHERE l.id = $1`,
      [loanId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'loan no encontrado' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[getLoanHeader]', err);
    return res.status(500).json({ error: 'getLoanHeader failed' });
  }
}

export async function getLoanItems(req, res) {
  const loanId = Number(req.params.loanId);
  if (!loanId) return res.status(400).json({ error: 'loanId inválido' });

  try {
    const { rows } = await pool.query(
      `SELECT
         li.id AS item_id, li.loan_id, li.book_id, li.qty,
         li.renewal_count, li.returned_at, li.fine_cents,
         b.title, b.author, b.isbn13, b.isbn10, b.cover_url
       FROM loan_items li
       JOIN books b ON b.id = li.book_id
       WHERE li.loan_id = $1
       ORDER BY li.id ASC`,
      [loanId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[getLoanItems]', err);
    return res.status(500).json({ error: 'getLoanItems failed' });
  }
}

export async function getLoanEvents(req, res) {
  const loanId = Number(req.params.loanId);
  if (!loanId) return res.status(400).json({ error: 'loanId inválido' });

  try {
    // Si no existe la tabla loan_events, devolvemos []
    const check = await pool.query(
      `SELECT to_regclass('public.loan_events') AS t`
    );
    if (!check.rows[0]?.t) return res.json([]);

    const { rows } = await pool.query(
      `SELECT id, loan_id, loan_item_id, event_type, meta, created_at
       FROM loan_events
       WHERE loan_id = $1
       ORDER BY id ASC`,
      [loanId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[getLoanEvents]', err);
    return res.status(500).json({ error: 'getLoanEvents failed' });
  }
}

export async function addLoanItem(req, res) {
  const loanId = Number(req.params.loanId);
  const { isbn, book_id } = req.body || {};
  if (!loanId) return res.status(400).json({ error: 'loanId inválido' });
  if (!isbn && !book_id) {
    return res.status(400).json({ error: 'Provee isbn o book_id' });
  }

  try {
    const out = await inTx(async (client) => {
      if (isbn) {
        // Usa función add_item_by_isbn(loan_id, isbn)
        const { rows } = await client.query(
          `SELECT add_item_by_isbn($1,$2) AS loan_item_id`,
          [loanId, isbn]
        );
        return rows[0];
      }

      // Alta por book_id directo (respeta límite de 2 y stock)
      // 1) usuario del loan
      const { rows: lr } = await client.query(
        `SELECT user_id FROM loans WHERE id=$1 FOR UPDATE`,
        [loanId]
      );
      if (!lr[0]) throw new Error('loan no encontrado');
      const userId = lr[0].user_id;

      // 2) activos
      const { rows: ar } = await client.query(
        `SELECT COUNT(*)::int AS c
         FROM loan_items li
         JOIN loans l ON l.id=li.loan_id
         WHERE l.user_id=$1 AND l.status IN ('active','overdue') AND li.returned_at IS NULL`,
        [userId]
      );
      if ((ar[0]?.c ?? 0) >= 2) {
        throw new Error('Límite de 2 libros activos por usuario');
      }

      // 3) stock del libro
      const { rows: br } = await client.query(
        `SELECT stock FROM books WHERE id=$1 FOR UPDATE`,
        [book_id]
      );
      if (!br[0]) throw new Error('book no encontrado');
      if (Number(br[0].stock) <= 0) throw new Error('Sin stock disponible');

      // 4) inserta (trigger de stock descuenta)
      const { rows: ir } = await client.query(
        `INSERT INTO loan_items(loan_id, book_id)
         VALUES ($1,$2)
         RETURNING id AS loan_item_id`,
        [loanId, book_id]
      );
      return ir[0];
    });

    return res.status(201).json(out);
  } catch (err) {
    console.error('[addLoanItem]', err);
    return res.status(500).json({ error: err.message || 'addLoanItem failed' });
  }
}

export async function renewLoanItem(req, res) {
  const itemId = Number(req.params.itemId);
  if (!itemId) return res.status(400).json({ error: 'itemId inválido' });

  try {
    const rows = await inTx(async (client) => {
      // Guardas previas: estado del loan y del ítem
      const { rows: st } = await client.query(
        `SELECT l.status AS loan_status, li.returned_at
           FROM loan_items li
           JOIN loans l ON l.id = li.loan_id
          WHERE li.id = $1
          FOR UPDATE`,
        [itemId]
      );
      if (!st[0]) throw new Error('loan_item no encontrado');
      if (st[0].loan_status === 'canceled') throw new Error('No se puede renovar: préstamo cancelado');
      if (st[0].returned_at) throw new Error('No se puede renovar: ítem ya devuelto');

      const { rows } = await client.query(
        `SELECT renew_item($1) AS new_due_date`,
        [itemId]
      );
      return rows;
    });

    return res.json({ loan_item_id: itemId, due_date: rows[0].new_due_date });
  } catch (err) {
    console.error('[renewLoanItem]', err);
    return res.status(500).json({ error: err.message || 'renewLoanItem failed' });
  }
}


export async function returnLoanItem(req, res) {
  const itemId = Number(req.params.itemId);
  const { returned_at } = req.body || {};
  if (!itemId) return res.status(400).json({ error: 'itemId inválido' });

  try {
    const row = await inTx(async (client) => {
      // lock ítem + estado del préstamo
      const { rows: before } = await client.query(
        `SELECT li.id, li.returned_at, li.fine_cents, l.status AS loan_status
           FROM loan_items li
           JOIN loans l ON l.id = li.loan_id
          WHERE li.id=$1
          FOR UPDATE`,
        [itemId]
      );
      if (!before[0]) throw new Error('loan_item no encontrado');

      if (before[0].loan_status === 'canceled') {
        throw new Error('No se puede devolver: préstamo cancelado');
      }

      if (before[0].returned_at) {
        // idempotente: ya devuelto
        return before[0];
      }

      const dateToSet = returned_at || todayISO();

       // === NUEVO: calcular multa al devolver ===
      // 1) settings (multa por día en centavos)
      const { rows: stg } = await client.query(
        `SELECT fine_per_day_cents FROM loan_settings LIMIT 1`
      );
      const finePerDay = Number(stg[0]?.fine_per_day_cents || 0);

      // 2) datos del préstamo para calcular días de multa
      const { rows: lend } = await client.query(
        `SELECT l.due_date, l.period_id
           FROM loan_items li
           JOIN loans l ON l.id = li.loan_id
          WHERE li.id = $1`,
        [itemId]
      );
      const due = lend[0]?.due_date;
      const periodId = lend[0]?.period_id;

      // 3) días de multa con tu función SQL
      let fineDays = 0;
      if (due && dateToSet) {
        const { rows: fd } = await client.query(
          `SELECT fine_days($1::date, $2::date, $3::bigint) AS d`,
          [due, dateToSet, periodId]
        );
        fineDays = Number(fd[0]?.d || 0);
      }
      const fineCents = Math.max(0, fineDays * finePerDay);

     const { rows } = await client.query(
        `UPDATE loan_items
            SET returned_at = $2,
                fine_cents = $3
          WHERE id = $1
          RETURNING id, returned_at, fine_cents`,
        [itemId, dateToSet, fineCents]
      );
      return rows[0];
    });

    return res.json({
      loan_item_id: row.id,
      returned_at: row.returned_at,
      fine_cents: row.fine_cents,
    });
  } catch (err) {
    console.error('[returnLoanItem]', err);
    return res.status(500).json({ error: err.message || 'returnLoanItem failed' });
  }
}


export async function registerPayment(req, res) {
  const itemId = Number(req.params.itemId);
  const { amount_mxn, method, note } = req.body || {};
  if (!itemId || amount_mxn == null) {
    return res.status(400).json({ error: 'itemId y amount_mxn son requeridos' });
  }

  try {
    const cents = Math.round(Number(amount_mxn) * 100);
    const { rows } = await pool.query(
      `INSERT INTO payments(loan_item_id, amount_cents, method, note)
       VALUES ($1,$2,$3,$4)
       RETURNING id, loan_item_id, paid_at, amount_cents, method, note`,
      [itemId, cents, method || null, note || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[registerPayment]', err);
    return res.status(500).json({ error: 'registerPayment failed' });
  }
}

/** ===================== (Opcional) listLoans ===================== **/

export async function listLoans(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 20)));
  const offset = (page - 1) * pageSize;

  try {
    const { rows } = await pool.query(
      `SELECT l.id, l.user_id, l.period_id, l.start_date, l.due_date, l.status,
              u.first_name, u.last_name, u.role,
              ap.name AS period_name
       FROM loans l
       JOIN users u ON u.id=l.user_id
       JOIN academic_periods ap ON ap.id=l.period_id
       ORDER BY l.created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );
    // total simple
    const { rows: tc } = await pool.query(`SELECT COUNT(*)::int AS total FROM loans`);
    return res.json({ items: rows, meta: { page, pageSize, total: tc[0].total } });
  } catch (err) {
    console.error('[listLoans]', err);
    return res.status(500).json({ error: 'listLoans failed' });
  }
}


/** ===================== Users ===================== **/

export async function findUsers(req, res) {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.json([])
    const { rows } = await pool.query(
      `SELECT u.id, u.role, u.first_name, u.last_name, u.sex, u.email,
              u.control_number, u.career_id, c.name AS career_name
       FROM users u
       LEFT JOIN careers c ON c.id = u.career_id
       WHERE u.email ILIKE $1 OR u.control_number ILIKE $1
       ORDER BY u.last_name, u.first_name
       LIMIT 20`,
      [`%${q}%`]
    )
    res.json(rows)
  } catch (err) {
    console.error('[findUsers]', err)
    res.status(500).json({ error: 'findUsers failed' })
  }
}

export async function createUser(req, res) {
  try {
    let { role, first_name, last_name, sex, control_number, career_id, email } = req.body || {}

    // Normalización mínima
    role = String(role || '').toLowerCase() // 'student' | 'professor'
    first_name = (first_name || '').trim()
    last_name  = (last_name  || '').trim()
    sex = (sex || '').toUpperCase()         // 'H' | 'M' | 'X'
    control_number = (control_number || '').trim()
    email = (email || '').trim().toLowerCase()

    // Validaciones front-friendly
    if (!role || !first_name || !last_name || !sex) {
      return res.status(400).json({ error: 'Campos obligatorios faltantes' })
    }
    if (!['H','M','X'].includes(sex)) {
      return res.status(400).json({ error: "El campo 'sex' debe ser H, M o X" })
    }

    let finalEmail = email
    if (role === 'student') {
      if (!control_number || !career_id) {
        return res.status(400).json({ error: 'Alumno requiere control_number y career_id' })
      }
      finalEmail = finalEmail || `${control_number}@tecnm.atitalaquia.mx`
    } else if (role === 'professor') {
      if (!finalEmail) return res.status(400).json({ error: 'Profesor requiere email' })
    } else {
      return res.status(400).json({ error: 'role inválido' })
    }

    const { rows } = await pool.query(
      `INSERT INTO users(role, first_name, last_name, sex, email, control_number, career_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, role, first_name, last_name, sex, email, control_number, career_id`,
      [role, first_name, last_name, sex, finalEmail, control_number || null, career_id || null]
    )

    if (!rows[0]) {
      // ya existía email; devuelve el existente
      const ex = await pool.query(
        `SELECT id, role, first_name, last_name, sex, email, control_number, career_id
         FROM users WHERE email=$1`,
        [finalEmail]
      )
      return res.status(200).json(ex.rows[0])
    }

    return res.status(201).json(rows[0])
  } catch (err) {
    console.error('[createUser]', err)
    return res.status(500).json({ error: err.message || 'createUser failed' })
  }
}

/** ===================== Careers (opcional para combo) ===================== **/
export async function listCareers(_req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name FROM careers ORDER BY name ASC`
    )
    res.json(rows)
  } catch (err) {
    console.error('[listCareers]', err)
    res.status(500).json({ error: 'listCareers failed' })
  }
}

/** ===================== Periods & Holidays ===================== **/

export async function listPeriods(_req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, date_start, date_end
       FROM academic_periods
       ORDER BY date_start DESC`
    )
    res.json(rows)
  } catch (err) {
    console.error('[listPeriods]', err)
    res.status(500).json({ error: 'listPeriods failed' })
  }
}

export async function listHolidays(req, res) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'period_id inválido' })
    const { rows } = await pool.query(
      `SELECT id, holiday_date
       FROM period_holidays
       WHERE period_id = $1
       ORDER BY holiday_date ASC`,
      [id]
    )
    res.json(rows)
  } catch (err) {
    console.error('[listHolidays]', err)
    res.status(500).json({ error: 'listHolidays failed' })
  }
}

export async function addHoliday(req, res) {
  try {
    const period_id = Number(req.params.id)
    const { holiday_date } = req.body || {}
    if (!period_id) return res.status(400).json({ error: 'period_id inválido' })
    if (!holiday_date) return res.status(400).json({ error: 'holiday_date requerido' })

    const { rows } = await pool.query(
      `INSERT INTO period_holidays(period_id, holiday_date)
       VALUES ($1,$2)
       ON CONFLICT (period_id, holiday_date) DO NOTHING
       RETURNING id, holiday_date`,
      [period_id, holiday_date]
    )
    res.status(rows[0] ? 201 : 200).json(rows[0] || { ok: true })
  } catch (err) {
    console.error('[addHoliday]', err)
    res.status(500).json({ error: 'addHoliday failed' })
  }
}

export async function deleteHoliday(req, res) {
  try {
    const period_id = Number(req.params.id)
    const date = req.params.date // 'YYYY-MM-DD'
    if (!period_id || !date) return res.status(400).json({ error: 'parámetros inválidos' })

    await pool.query(
      `DELETE FROM period_holidays WHERE period_id=$1 AND holiday_date=$2`,
      [period_id, date]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('[deleteHoliday]', err)
    res.status(500).json({ error: 'deleteHoliday failed' })
  }
}


// === NUEVO: listado para la tabla "with-items" ===
// === NUEVO: listado para la tabla "with-items" (sin depender de li.status) ===
export async function listLoansWithItems(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSizeParam = req.query.pageSize === 'all' ? 2000 : Number(req.query.pageSize || 20);
  const pageSize = Math.min(5000, Math.max(1, pageSizeParam));
  const offset = (page - 1) * pageSize;

  // Filtros básicos (q, period_id, role, sex, solo vencidos)
  const {
    q,                 // control o email
    period_id,
    start_from,        // YYYY-MM-DD
    start_to,          // YYYY-MM-DD
    role,              // student|professor
    sex,               // M|F  (se almacena M/F en BD)
    only_overdue       // '1'
  } = req.query;

  const where = [];
  const args  = [];

  // Filtro por estado del PRÉSTAMO (l.status) — aceptar 'canceled' o 'cancelled'
  if (req.query.status) {
    let st = String(req.query.status).toLowerCase().trim();
    if (st === 'canceled') st = 'cancelled'; // tolerancia
    // validamos solo contra los del enum de loans
    const allowed = ['active','overdue','returned','lost','damaged','cancelled'];
    if (allowed.includes(st)) {
      args.push(st);
      where.push(`l.status = $${args.length}`);
    }
  }

  if (q)         { args.push(`%${q}%`); where.push(`(u.email ILIKE $${args.length} OR u.control_number ILIKE $${args.length})`); }
  if (period_id) { args.push(Number(period_id)); where.push(`l.period_id = $${args.length}`); }
  if (start_from){ args.push(start_from); where.push(`l.start_date >= $${args.length}`); }
  if (start_to)  { args.push(start_to);   where.push(`l.start_date <= $${args.length}`); }
  if (role)      { args.push(String(role).toLowerCase()); where.push(`u.role = $${args.length}`); }
  if (sex)       { args.push(String(sex).toUpperCase());  where.push(`u.sex  = $${args.length}`); }

  // Sólo préstamos vencidos con algún ítem sin devolver
  if (only_overdue === '1') {
    where.push(`(l.due_date < CURRENT_DATE AND EXISTS (
      SELECT 1 FROM loan_items li2
      WHERE li2.loan_id = l.id AND li2.returned_at IS NULL
    ))`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `
      SELECT
        li.id            AS item_id,
        l.id             AS loan_id,
        l.start_date     AS started_at,
        l.due_date       AS due_at,
        l.status         AS loan_status,

        u.id             AS person_id,
        (u.first_name || ' ' || u.last_name) AS person_name,
        u.control_number AS person_control,
        u.sex            AS person_sex,      -- se almacena 'M'/'F'; en reportes lo mapearás a 'H'/'M'
        u.role           AS person_role,
        u.email          AS person_email,
        c.name           AS career_name,

        ap.name          AS period_name,
        EXTRACT(YEAR FROM ap.date_start)::int AS period_year,

        b.id             AS book_id,
        b.title          AS book_title,
        b.author         AS book_author,
        b.isbn13         AS book_isbn13,
        b.isbn10         AS book_isbn10,

        li.renewal_count,
        li.returned_at,
        li.fine_cents,
  COALESCE(p.sum_pay, 0)        AS paid_cents,
  GREATEST(li.fine_cents - COALESCE(p.sum_pay,0), 0) AS debt_cents,
  CASE WHEN li.returned_at IS NOT NULL AND li.returned_at::date > l.due_date::date THEN true ELSE false END AS was_overdue,       

        -- Deriva el estado del ÍTEM SIN usar li.status:
        CASE
          WHEN li.returned_at IS NOT NULL THEN 'returned'
          WHEN l.due_date < CURRENT_DATE   THEN 'overdue'
          ELSE 'checked_out'
        END AS item_status
      FROM loan_items li
      JOIN loans l             ON l.id = li.loan_id
      JOIN users u             ON u.id = l.user_id
      LEFT JOIN careers c      ON c.id = u.career_id
      JOIN academic_periods ap ON ap.id = l.period_id
      JOIN books b             ON b.id = li.book_id

      LEFT JOIN (
  SELECT loan_item_id, SUM(amount_cents)::int AS sum_pay
  FROM payments
  GROUP BY loan_item_id
) p ON p.loan_item_id = li.id

      ${whereSql}
      ORDER BY li.id DESC
      LIMIT $${args.length+1} OFFSET $${args.length+2}
      `,
      [...args, pageSize, offset]
    );

    const { rows: tc } = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM loan_items li
      JOIN loans l ON l.id = li.loan_id
      JOIN users u ON u.id = l.user_id
      ${whereSql}
      `,
      args
    );

    res.json({ items: rows, meta: { page, pageSize, total: tc[0].total } });
  } catch (err) {
    console.error('[listLoansWithItems]', err);
    res.status(500).json({ error: 'listLoansWithItems failed' });
  }
}



// === NUEVO: cancelar préstamo (marca status='cancelled') ===
export async function cancelLoan(req, res) {
  const loanId = Number(req.params.loanId);
  if (!loanId) return res.status(400).json({ error: 'loanId inválido' });

  try {
    const out = await inTx(async (client) => {
      // 1) Lock del préstamo
      const { rows: lr } = await client.query(
        `SELECT id, status FROM loans WHERE id=$1 FOR UPDATE`,
        [loanId]
      );
      if (!lr[0]) throw new Error('loan no encontrado');
      const currentStatus = String(lr[0].status);

      if (currentStatus === 'cancelled') {
        // Ya estaba cancelado: idempotente
        return { status: 'cancelled', updated: false };
      }

      // 2) No permitir cancelar si YA hay ítems devueltos (regla de negocio)
      const { rows: items } = await client.query(
        `SELECT id, returned_at FROM loan_items WHERE loan_id=$1`,
        [loanId]
      );
      const anyReturned = items.some(it => !!it.returned_at);
      if (anyReturned) {
        throw new Error('No se puede cancelar: el préstamo ya tiene ítems devueltos');
      }

      // 3) Marcar como devueltos los ítems pendientes (para liberar stock via trigger)
      const today = todayISO();
      await client.query(
        `UPDATE loan_items SET returned_at=$2 WHERE loan_id=$1 AND returned_at IS NULL`,
        [loanId, today]
      );

      // 4) Cambiar estado del préstamo
      await client.query(
        `UPDATE loans SET status='cancelled', updated_at=NOW() WHERE id=$1`,
        [loanId]
      );

      return { status: 'cancelled', updated: true };
    });

    return res.json({ ok: true, status: out.status });
  } catch (err) {
    console.error('[cancelLoan]', err);
    return res.status(500).json({ error: err.message || 'cancelLoan failed' });
  }
}

// ⬇️ agrega esto al final del archivo (o cerca de createLoan)
export async function calcDueDate(req, res) {
  try {
    // admite ?start_date=YYYY-MM-DD&period_id=1&role=student  ó  ?start_date=...&period_id=...&user_id=123
    let { start_date, period_id, role, user_id } = req.query || {};
    if (!start_date || !period_id) {
      return res.status(400).json({ error: 'start_date y period_id son requeridos' });
    }

    // si no mandan role, lo inferimos con user_id
    if (!role && user_id) {
      const { rows } = await pool.query(`SELECT role FROM users WHERE id=$1`, [user_id]);
      role = rows[0]?.role;
    }

    role = String(role || '').toLowerCase();
    if (role !== 'student') {
      // solo calculamos para alumno; para profesor el front permite editar manualmente
      return res.status(400).json({ error: 'Solo alumnos calculan due_date automático' });
    }

    // 3 días hábiles (ajústalo si tu regla cambia)
    const { rows } = await pool.query(
      `SELECT add_business_days($1::date, 3, $2::bigint) AS due_date`,
      [start_date, Number(period_id)]
    );
    return res.json({ due_date: rows[0]?.due_date || null });
  } catch (err) {
    console.error('[calcDueDate]', err);
    return res.status(500).json({ error: err.message || 'calcDueDate failed' });
  }
}

// 👇 util zonal
const isoOnly = (d) => new Date(d).toISOString().slice(0,10)

/**
 * GET /api/v1/admin/loans/preview-due?user_id=..&period_id=..&start_date=YYYY-MM-DD&due_date=YYYY-MM-DD(opc)
 * - student  -> calcula due_date = add_business_days(start, 3, period_id)
 * - professor-> requiere due_date y valida que sea >= start y dentro del periodo
 */
export async function previewDueDate(req, res) {
  try {
    const user_id   = Number(req.query.user_id)
    const period_id = Number(req.query.period_id)
    const start     = req.query.start_date ? isoOnly(req.query.start_date) : isoOnly(new Date())
    const due_in    = req.query.due_date ? isoOnly(req.query.due_date) : null

    if (!user_id || !period_id) {
      return res.status(400).json({ error: 'user_id y period_id son requeridos' })
    }

    // role + periodo
    const [u, p] = await Promise.all([
      pool.query(`SELECT role FROM users WHERE id=$1`, [user_id]),
      pool.query(`SELECT date_start, date_end FROM academic_periods WHERE id=$1`, [period_id])
    ])
    if (!u.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' })
    if (!p.rows[0]) return res.status(404).json({ error: 'Periodo no encontrado' })

    const role = String(u.rows[0].role)
    const { date_start, date_end } = p.rows[0]

    if (role === 'student') {
      // usa tu función SQL existente add_business_days(base, n, period_id)
      const { rows } = await pool.query(
        `SELECT add_business_days($1::date, 3, $2::bigint) AS due_date`,
        [start, period_id]
      )
      return res.json({ start_date: start, due_date: rows[0].due_date })
    }

    // profesor: due_date obligatorio y validado
    if (!due_in) {
      return res.status(400).json({ error: 'Profesores requieren due_date explícito' })
    }
    if (new Date(due_in) < new Date(start)) {
      return res.status(400).json({ error: 'due_date debe ser >= start_date' })
    }
    if (new Date(due_in) < new Date(date_start) || new Date(due_in) > new Date(date_end)) {
      return res.status(400).json({ error: 'due_date fuera del rango del periodo' })
    }
    return res.json({ start_date: start, due_date: due_in })
  } catch (err) {
    console.error('[previewDueDate]', err)
    res.status(500).json({ error: err.message || 'previewDueDate failed' })
  }
}

// === MARCAR ÍTEM PERDIDO ===
export async function markItemLost(req, res) {
  const itemId = Number(req.params.itemId);
  if (!itemId) return res.status(400).json({ error: 'itemId inválido' });

  try {
    const row = await inTx(async (client) => {
      // Lock + estado del préstamo
      const { rows: st } = await client.query(
        `SELECT li.id, li.status, li.returned_at, l.status AS loan_status
           FROM loan_items li
           JOIN loans l ON l.id = li.loan_id
          WHERE li.id=$1
          FOR UPDATE`,
        [itemId]
      );
      if (!st[0]) throw new Error('loan_item no encontrado');
      if (st[0].loan_status === 'canceled') throw new Error('No se puede marcar perdido: préstamo cancelado');
      if (st[0].status === 'lost') return st[0];        // idempotente
      if (st[0].status === 'returned') throw new Error('Ítem ya devuelto');

      const { rows } = await client.query(
        `UPDATE loan_items
            SET status='lost', returned_at=NULL
          WHERE id=$1
          RETURNING id, status, returned_at, fine_cents`,
        [itemId]
      );
      return rows[0];
    });

    return res.json({ loan_item_id: row.id, status: row.status, returned_at: row.returned_at, fine_cents: row.fine_cents });
  } catch (err) {
    console.error('[markItemLost]', err);
    return res.status(500).json({ error: err.message || 'markItemLost failed' });
  }
}

// === MARCAR ÍTEM DAÑADO ===
export async function markItemDamaged(req, res) {
  const itemId = Number(req.params.itemId);
  if (!itemId) return res.status(400).json({ error: 'itemId inválido' });

  try {
    const row = await inTx(async (client) => {
      const { rows: st } = await client.query(
        `SELECT li.id, li.status, li.returned_at, l.status AS loan_status
           FROM loan_items li
           JOIN loans l ON l.id = li.loan_id
          WHERE li.id=$1
          FOR UPDATE`,
        [itemId]
      );
      if (!st[0]) throw new Error('loan_item no encontrado');
      if (st[0].loan_status === 'canceled') throw new Error('No se puede marcar dañado: préstamo cancelado');
      if (st[0].status === 'damaged') return st[0];    // idempotente
      if (st[0].status === 'returned') throw new Error('Ítem ya devuelto');

      const { rows } = await client.query(
        `UPDATE loan_items
            SET status='damaged', returned_at=NULL
          WHERE id=$1
          RETURNING id, status, returned_at, fine_cents`,
        [itemId]
      );
      return rows[0];
    });

    return res.json({ loan_item_id: row.id, status: row.status, returned_at: row.returned_at, fine_cents: row.fine_cents });
  } catch (err) {
    console.error('[markItemDamaged]', err);
    return res.status(500).json({ error: err.message || 'markItemDamaged failed' });
  }
}




