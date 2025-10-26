// server/src/controllers/admin-books.quick.controller.js
import { pool } from '../db/pool.js'

const norm = (s='') => (s || '').replace(/[^0-9Xx]/g,'').toUpperCase()

export async function getBookByIsbn(req, res) {
  const q = norm(req.params.q || '')
  if (!q) return res.status(400).json({ error: 'ISBN requerido' })
  const { rows } = await pool.query(
    `SELECT id, title, author, isbn13, isbn10, cover_url, stock
     FROM books
     WHERE REPLACE(UPPER(COALESCE(isbn13,'')),'-','') = $1
        OR REPLACE(UPPER(COALESCE(isbn10,'')),'-','') = $1
     LIMIT 1`, [q]
  )
  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })
  res.json(rows[0])
}

export async function searchBooks(req, res) {
  const qraw = (req.query.q || '').trim()
  const q = `%${qraw}%`
  const limit = Math.min(50, parseInt(req.query.limit || '10', 10))
  const { rows } = await pool.query(
    `SELECT id, title, author, isbn13, isbn10, cover_url, stock
     FROM books
     WHERE title ILIKE $1
        OR author ILIKE $1
        OR isbn13 ILIKE $1
        OR isbn10 ILIKE $1
     ORDER BY created_at DESC
     LIMIT $2`, [q, limit]
  )
  res.json(rows)
}
