// controllers/adminpeople.controller.js
import { query as dbQuery, getClient, safeRollback } from '../db/index.js'

const ROLES = new Set(['STUDENT','PROFESSOR'])
const SEXES = new Set(['H','M','X'])

/** Helpers de normalización */
function normStr(v) {
  return (typeof v === 'string') ? v.trim() : v
}
function normEmail(v) {
  return (typeof v === 'string') ? v.trim().toLowerCase() : v
}
function normControl(v) {
  // Si tu convención es mayúsculas, ajusta aquí:
  return (typeof v === 'string') ? v.trim().toUpperCase() : v
}

/** POST /admin/people */
export const createPerson = async (req, res) => {
  const client = await getClient()
  try {
    let {
      role,           // 'STUDENT' | 'PROFESSOR' (requerido)
      full_name,      // string (requerido)
      sex,            // 'H' | 'M' | 'X' (requerido)
      control_number, // string (requerido si STUDENT)
      career_id,      // int    (requerido si STUDENT)
      email           // string (requerido si PROFESSOR; opcional en STUDENT)
    } = req.body || {}

    // --- Normalización básica (NEW) ---
    role = normStr(role)
    full_name = normStr(full_name)
    sex = normStr(sex)
    control_number = normControl(control_number)
    email = normEmail(email)

    // Validaciones básicas
    if (!role || !ROLES.has(role)) return res.status(400).json({ message: 'role inválido' })
    if (!full_name) return res.status(400).json({ message: 'full_name requerido' })
    if (!sex || !SEXES.has(sex)) return res.status(400).json({ message: 'sex inválido' })

    if (role === 'STUDENT') {
      if (!control_number) return res.status(400).json({ message: 'control_number requerido para STUDENT' })
      if (!career_id) return res.status(400).json({ message: 'career_id requerido para STUDENT' })
    } else if (role === 'PROFESSOR') {
      if (!email) return res.status(400).json({ message: 'email requerido para PROFESSOR' })
    }

    await client.query('BEGIN')

    // Si es STUDENT: evitar duplicados por control_number
    if (role === 'STUDENT') {
      const { rows: ex } = await client.query(
        `SELECT id FROM people WHERE role='STUDENT' AND control_number = $1 LIMIT 1`,
        [control_number]
      )
      if (ex[0]) {
        await client.query('COMMIT')
        return res.status(200).json({ id: ex[0].id }) // reusar existente
      }
    }

    // Si es PROFESSOR: evitar duplicados por email
    if (role === 'PROFESSOR' && email) {
      const { rows: ex } = await client.query(
        `SELECT id FROM people WHERE role='PROFESSOR' AND LOWER(email) = LOWER($1) LIMIT 1`,
        [email]
      )
      if (ex[0]) {
        await client.query('COMMIT')
        return res.status(200).json({ id: ex[0].id })
      }
    }

    // Validar carrera si aplica
    if (role === 'STUDENT') {
      const { rows: c } = await client.query(`SELECT 1 FROM careers WHERE id = $1`, [career_id])
      if (!c[0]) {
        await safeRollback(client)
        return res.status(400).json({ message: 'career_id no existe' })
      }
    }

    // Insert
    const { rows } = await client.query(
      `INSERT INTO people (role, full_name, sex, control_number, career_id, email)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, role, full_name, sex, control_number, career_id, email`,
      [role, full_name, sex, control_number || null, career_id || null, email || null]
    )

    await client.query('COMMIT')
    return res.status(201).json(rows[0])
  } catch (err) {
    await safeRollback(client)
    res.status(500).json({ message: err.message || 'Error al crear persona' })
  } finally {
    client.release()
  }
}

/** GET /admin/people/search?q=...&limit=10  (NEW)
 *  Devuelve { items: [...] } con coincidencias por nombre, control_number o email.
 */
export const searchPeople = async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 10)
    if (q.length < 3) return res.json({ items: [] }) // mismo criterio que el front

    // Usa ILIKE para búsqueda flexible
    const like = `%${q}%`
    const { rows } = await dbQuery(
      `SELECT pe.id, pe.full_name, pe.role, pe.control_number, pe.email,
              ca.name AS career_name
         FROM people pe
    LEFT JOIN careers ca ON ca.id = pe.career_id
        WHERE pe.full_name ILIKE $1
           OR pe.control_number ILIKE $1
           OR pe.email ILIKE $1
     ORDER BY pe.full_name ASC
        LIMIT $2`,
      [like, limit]
    )

    return res.json({ items: rows })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error en búsqueda de personas' })
  }
}


