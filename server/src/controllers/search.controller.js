// Search controller
import { pool } from "../db/pool.js";

export const suggest = async (req, res, next) => {
  try {
    const q = (req.query.q ?? "").trim();
    if (!q) return res.json([]);
    const limit = Math.min(parseInt(req.query.limit ?? 8), 20);
    const { rows } = await pool.query(
      `SELECT id, title, author FROM books
       WHERE title ILIKE $1 OR author ILIKE $1
       ORDER BY title
       LIMIT $2`,
      ['%' + q + '%', limit]
    );
    res.json(rows);
  } catch (e) { next(e); }
};
