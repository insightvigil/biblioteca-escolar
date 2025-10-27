// server/src/controllers/adminlibraryusers.controller.js
import { pool } from '../db/pool.js'

/** ============ READ ============ **/
export const getAllLibraryUsers = async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.*, 
        c.name AS career_name,
        COALESCE(l.total_loans, 0)::int AS total_loans
      FROM users u
      LEFT JOIN careers c 
        ON u.career_id = c.id
      LEFT JOIN (
        SELECT user_id, COUNT(id) AS total_loans
        FROM loans
        GROUP BY user_id
      ) l
        ON l.user_id = u.id
      ORDER BY u.role, u.id;
    `
    const { rows } = await pool.query(sql)
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

export const getLibraryUserById = async (req, res, next) => {
  try {
    const identificador = req.params.id
    const sql = `
      SELECT
        u.id,
        u.role,
        u.first_name,
        u.last_name,
        u.sex,
        u.email,
        u.control_number,
        u.career_id, 
        c.name AS career_name,
        COALESCE(l.total_loans, 0)::int AS total_loans
      FROM users u
      LEFT JOIN careers c ON u.career_id = c.id
      LEFT JOIN (
        SELECT user_id, COUNT(id) AS total_loans
        FROM loans
        GROUP BY user_id
      ) l ON l.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `
    const { rows } = await pool.query(sql, [identificador])
    if (rows.length === 0) return res.status(404).json({ error: 'No encontrado' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

/** ============ CREATE ============ **/
export const createLibraryUser = async (req, res) => {
  try {
    const {
      role,           // 'student' | 'professor' | ...
      first_name,
      last_name,
      sex,            // 'M' | 'F'  (convención del proyecto)
      email,
      control_number, // estudiantes
      career_id,      // estudiantes
      is_active = true
    } = req.body || {}

    if (!role || !first_name || !last_name || !sex || !email) {
      return res.status(400).json({ error: 'role, first_name, last_name, sex y email son requeridos' })
    }
    if (!['M','F'].includes(sex)) {
      return res.status(400).json({ error: 'sex debe ser M o F' })
    }

    // Regla: profesores no requieren control_number ni career_id
    const finalControl = role === 'professor' ? null : (control_number ?? null)
    const finalCareer  = role === 'professor' ? null : (career_id ?? null)

    const insertSql = `
      INSERT INTO users (role, first_name, last_name, sex, email, control_number, career_id, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
    `
    const { rows: ins } = await pool.query(insertSql, [
      role, first_name?.trim(), last_name?.trim(), sex, email?.trim(),
      finalControl, finalCareer, is_active
    ])

    const newId = ins[0].id
    // Devolver el registro creado (con joins útiles)
    const { rows } = await pool.query(`
      SELECT u.*, c.name AS career_name
      FROM users u
      LEFT JOIN careers c ON u.career_id = c.id
      WHERE u.id = $1
    `, [newId])

    res.status(201).json(rows[0])
  } catch (err) {
    // Un ejemplo de manejo de conflicto por email único (si tu tabla lo tiene)
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Conflicto: email o control_number duplicado' })
    }
    console.error(err)
    res.status(500).json({ error: 'Error en el servidor' })
  }
}

/** ============ UPDATE (parcial) ============ **/
export const updateLibraryUser = async (req, res) => {
  try {
    const { id } = req.params
    const payload = req.body || {}

    // Lista blanca de campos permitidos
    const allowed = [
      'role', 'first_name', 'last_name', 'sex', 'email',
      'control_number', 'career_id', 'is_active'
    ]

    // Normaliza sex si viene
    if (payload.sex && !['M','F'].includes(payload.sex)) {
      return res.status(400).json({ error: 'sex debe ser M o F' })
    }

    // Si role = professor, limpiamos campos de estudiante
    if (payload.role === 'professor') {
      payload.control_number = null
      payload.career_id = null
    }

    // Construye SET dinámico
    const sets = []
    const vals = []
    let idx = 1
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(payload, k)) {
        sets.push(`${k} = $${idx++}`)
        vals.push(payload[k])
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' })
    }

    const sql = `
      UPDATE users
      SET ${sets.join(', ')},
          updated_at = NOW()
      WHERE id = $${idx}
      RETURNING id
    `
    vals.push(id)
    const { rows: upd } = await pool.query(sql, vals)
    if (upd.length === 0) return res.status(404).json({ error: 'No encontrado' })

    // Devuelve registro refrescado (con career_name)
    const { rows } = await pool.query(`
      SELECT u.*, c.name AS career_name
      FROM users u
      LEFT JOIN careers c ON u.career_id = c.id
      WHERE u.id = $1
    `, [id])

    res.json(rows[0])
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Conflicto: email o control_number duplicado' })
    }
    console.error(err)
    res.status(500).json({ error: 'Error en el servidor' })
  }
}

/** ============ DELETE ============ **/
export const deleteLibraryUser = async (req, res) => {
  try {
    const { id } = req.params

    // Verifica préstamos activos (si tu lógica lo requiere)
    const { rows: act } = await pool.query(`
      SELECT COUNT(*)::int AS active_items
      FROM loan_items li
      JOIN loans l ON l.id = li.loan_id
      WHERE l.user_id = $1 AND li.returned_at IS NULL
    `, [id])
    if (act[0]?.active_items > 0) {
      return res.status(409).json({ error: 'El usuario tiene ítems de préstamo activos' })
    }

    const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [id])
    if (rowCount === 0) return res.status(404).json({ error: 'No encontrado' })

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error en el servidor' })
  }
}
