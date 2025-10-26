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
      const { rows } = await client.query(
        `UPDATE loan_items
            SET returned_at = $2
          WHERE id = $1
          RETURNING id, returned_at, fine_cents`,
        [itemId, dateToSet]
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
  const { role, first_name, last_name, sex, control_number, career_id, email } = req.body || {}
  try {
    if (!role || !first_name || !last_name || !sex) {
      return res.status(400).json({ error: 'Campos obligatorios faltantes' })
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

    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[createUser]', err)
    res.status(500).json({ error: 'createUser failed' })
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
// === REEMPLAZA listLoansWithItems por esta versión enriquecida ===
export async function listLoansWithItems(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  // Si piden "todos", permite un pageSize grande; por defecto 10
  const pageSizeParam = req.query.pageSize === 'all' ? 2000 : Number(req.query.pageSize || 10);
  const pageSize = Math.min(5000, Math.max(1, pageSizeParam));
  const offset = (page - 1) * pageSize;

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
        u.sex            AS person_sex,
        u.role           AS person_role,

        ap.name          AS period_name,
        EXTRACT(YEAR FROM ap.date_start)::int AS period_year,

        b.id             AS book_id,
        b.title          AS book_title,
        b.author         AS book_author,
        b.isbn13         AS book_isbn13,
        b.isbn10         AS book_isbn10,

        li.renewal_count,
        li.returned_at,

        CASE
          WHEN li.returned_at IS NOT NULL THEN 'RETURNED'
          WHEN l.status = 'overdue'        THEN 'OVERDUE'
          ELSE 'CHECKED_OUT'
        END AS item_status
      FROM loan_items li
      JOIN loans l            ON l.id = li.loan_id
      JOIN users u            ON u.id = l.user_id
      JOIN academic_periods ap ON ap.id = l.period_id
      JOIN books b            ON b.id = li.book_id
      ORDER BY li.id DESC
      LIMIT $1 OFFSET $2
      `,
      [pageSize, offset]
    );

    // total = cantidad total de items (no filtramos por estado)
    const { rows: tc } = await pool.query(`SELECT COUNT(*)::int AS total FROM loan_items`);
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

      if (currentStatus === 'canceled') {
        // Ya estaba cancelado: idempotente
        return { status: 'canceled', updated: false };
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
        `UPDATE loans SET status='canceled', updated_at=NOW() WHERE id=$1`,
        [loanId]
      );

      return { status: 'canceled', updated: true };
    });

    return res.json({ ok: true, status: out.status });
  } catch (err) {
    console.error('[cancelLoan]', err);
    return res.status(500).json({ error: err.message || 'cancelLoan failed' });
  }
}