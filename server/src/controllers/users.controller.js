// server/src/controllers/users.controller.js
import { pool } from '../db/pool.js'

const ALLOWED_SEX  = new Set(['M','F','X'])
const ALLOWED_ROLE = new Set(['student','professor'])

function norm(v) { return (typeof v === 'string') ? v.trim() : v }
function normUpper(v) { return (typeof v === 'string') ? v.trim().toUpperCase() : v }
function normLower(v) { return (typeof v === 'string') ? v.trim().toLowerCase() : v }

function rowToUser(r) {
  return {
    id: r.id,
    role: r.role,
    first_name: r.first_name,
    last_name: r.last_name,
    sex: r.sex,
    email: r.email,
    control_number: r.control_number,
    career_id: r.career_id,
    career_name: r.career_name ?? r.career, // por si viene con alias
  }
}

/** GET /admin/users/find?q=...  (compat con tu GUI) */
export async function findUsers(req, res) {
  try {
    const q = (req.query.q || '').trim()
    if (q.length < 3) return res.json([])

    const like = `%${q}%`
    const { rows } = await pool.query(
      `SELECT u.id, u.role, u.first_name, u.last_name, u.sex, u.email,
              u.control_number, u.career_id, c.name AS career_name
         FROM users u
    LEFT JOIN careers c ON c.id = u.career_id
        WHERE u.email ILIKE $1
           OR u.control_number ILIKE $1
           OR (u.first_name || ' ' || u.last_name) ILIKE $1
     ORDER BY u.last_name, u.first_name
        LIMIT 20`,
      [like]
    )
    res.json(rows.map(rowToUser))
  } catch (err) {
    console.error('[findUsers]', err)
    res.status(500).json({ error: 'findUsers failed' })
  }
}

/** GET /admin/users (paginado + filtro q) */
export async function listUsers(req, res) {
  try {
    const q = (req.query.q || '').trim()
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const offset = (page - 1) * pageSize

    const where = []
    const params = []

    if (q) {
      params.push(`%${q}%`)
      where.push(`(u.email ILIKE $${params.length}
               OR u.control_number ILIKE $${params.length}
               OR (u.first_name || ' ' || u.last_name) ILIKE $${params.length})`)
    }
    const W = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const sql = `
      SELECT u.id, u.role, u.first_name, u.last_name, u.sex, u.email,
             u.control_number, u.career_id, c.name AS career_name,
             COUNT(*) OVER() AS __total
        FROM users u
   LEFT JOIN careers c ON c.id = u.career_id
        ${W}
    ORDER BY u.last_name, u.first_name
       LIMIT $${params.push(pageSize)} OFFSET $${params.push(offset)}
    `

    const { rows } = await pool.query(sql, params)
    const total = rows[0]?.__total ? Number(rows[0].__total) : 0
    res.json({ items: rows.map(r => { const { __total, ...x } = r; return rowToUser(x) }), meta: { page, pageSize, total } })
  } catch (err) {
    console.error('[listUsers]', err)
    res.status(500).json({ error: 'listUsers failed' })
  }
}

/** GET /admin/users/:id */
export async function getUser(req, res) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'id inválido' })

    const { rows } = await pool.query(
      `SELECT u.id, u.role, u.first_name, u.last_name, u.sex, u.email,
              u.control_number, u.career_id, c.name AS career_name
         FROM users u
    LEFT JOIN careers c ON c.id = u.career_id
        WHERE u.id = $1
        LIMIT 1`,
      [id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(rowToUser(rows[0]))
  } catch (err) {
    console.error('[getUser]', err)
    res.status(500).json({ error: 'getUser failed' })
  }
}

/** POST /admin/users  (compat con tu GUI) */
export async function createUser(req, res) {
  try {
    let { role, first_name, last_name, sex, control_number, career_id, email } = req.body || {}

    role = normLower(role) // 'student' | 'professor'
    first_name = norm(first_name)
    last_name  = norm(last_name)
    sex = normUpper(sex)   // 'M' | 'F' | 'X'
    control_number = norm(control_number)
    email = normLower(email)

    if (!role || !ALLOWED_ROLE.has(role)) {
      return res.status(400).json({ error: "role inválido (usa 'student' o 'professor')" })
    }
    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'first_name y last_name son requeridos' })
    }
    if (!sex || !ALLOWED_SEX.has(sex)) {
      return res.status(400).json({ error: "sex inválido (usa 'M','F' o 'X')" })
    }

    let finalEmail = email
    if (role === 'student') {
      if (!control_number || !career_id) {
        return res.status(400).json({ error: 'Alumno requiere control_number y career_id' })
      }
      finalEmail = finalEmail || `${control_number}@tecnm.atitalaquia.mx`
    } else if (role === 'professor') {
      if (!finalEmail) return res.status(400).json({ error: 'Profesor requiere email' })
    }

    const { rows } = await pool.query(
      `INSERT INTO users(role, first_name, last_name, sex, email, control_number, career_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, role, first_name, last_name, sex, email, control_number, career_id`,
      [role, first_name, last_name, sex, finalEmail, control_number || null, career_id || null]
    )

    if (!rows[0]) {
      // email ya existía → devolver existente para que el front no se caiga
      const ex = await pool.query(
        `SELECT id, role, first_name, last_name, sex, email, control_number, career_id
           FROM users WHERE email=$1`,
        [finalEmail]
      )
      return res.status(200).json(rowToUser(ex.rows[0]))
    }

    return res.status(201).json(rowToUser(rows[0]))
  } catch (err) {
    console.error('[createUser]', err)
    return res.status(500).json({ error: err.message || 'createUser failed' })
  }
}

/** PUT /admin/users/:id */
export async function updateUser(req, res) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'id inválido' })

    let { role, first_name, last_name, sex, email, control_number, career_id } = req.body || {}

    // Normalizaciones (solo si vienen)
    if (role != null) role = normLower(role)
    if (sex  != null) sex  = normUpper(sex)
    if (email!= null) email= normLower(email)

    if (role != null && !ALLOWED_ROLE.has(role)) {
      return res.status(400).json({ error: "role inválido (usa 'student' o 'professor')" })
    }
    if (sex != null && !ALLOWED_SEX.has(sex)) {
      return res.status(400).json({ error: "sex inválido (usa 'M','F' o 'X')" })
    }

    const { rows } = await pool.query(
      `UPDATE users SET
         role = COALESCE($2, role),
         first_name = COALESCE($3, first_name),
         last_name  = COALESCE($4, last_name),
         sex        = COALESCE($5, sex),
         email      = COALESCE($6, email),
         control_number = COALESCE($7, control_number),
         career_id  = COALESCE($8, career_id)
       WHERE id = $1
       RETURNING id, role, first_name, last_name, sex, email, control_number, career_id`,
      [id, role, first_name, last_name, sex, email, control_number, career_id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(rowToUser(rows[0]))
  } catch (err) {
    console.error('[updateUser]', err)
    res.status(500).json({ error: 'updateUser failed' })
  }
}

/** DELETE /admin/users/:id */
export async function deleteUser(req, res) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'id inválido' })
    const { rows } = await pool.query(`DELETE FROM users WHERE id=$1 RETURNING id`, [id])
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json({ id: rows[0].id, deleted: true })
  } catch (err) {
    console.error('[deleteUser]', err)
    res.status(500).json({ error: 'deleteUser failed' })
  }
}
