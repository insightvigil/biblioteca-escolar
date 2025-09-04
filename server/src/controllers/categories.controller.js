// Categories controller
import { pool } from "../db/pool.js";
import { badRequest, notFoundErr } from "../utils/httpErrors.js";

export const list = async (_req, res) => {
  const { rows } = await pool.query("SELECT id, name, description FROM categories ORDER BY name");
  res.json(rows);
};

export const create = async (req, res, next) => {
  try {
    const { name, description = "" } = req.body;
    if (!name?.trim()) throw badRequest("El nombre es obligatorio");
    const { rows } = await pool.query(
      "INSERT INTO categories(name, description) VALUES($1,$2) RETURNING *",
      [name.trim(), description]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description = "" } = req.body;
    const { rows } = await pool.query(
      "UPDATE categories SET name=$1, description=$2 WHERE id=$3 RETURNING *",
      [name, description, id]
    );
    if (!rows[0]) throw notFoundErr("Categoría no encontrada");
    res.json(rows[0]);
  } catch (e) { next(e); }
};

export const remove = async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM categories WHERE id=$1", [id]);
  res.status(204).end();
};


// Get single category
export const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "SELECT id, name, description FROM categories WHERE id=$1",
      [id]
    );
    if (!rows[0]) throw notFoundErr("Categoría no encontrada");
    res.json(rows[0]);
  } catch (e) { next(e); }
};

// Books by category with pagination and filters
export const booksByCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = Math.max(parseInt(req.query.page ?? 1), 1);
    const pageSize = Math.min(parseInt(req.query.limit ?? 20), 100);
    const offset = (page - 1) * pageSize;
    const q = (req.query.q ?? "").trim();
    const available = req.query.available;
    const allowedSort = new Set(["title","created_at","author"]);
    const sort = allowedSort.has(req.query.sort) ? req.query.sort : "title";
    const order = req.query.order === "desc" ? "DESC" : "ASC";

    const params = [id];
    let where = "b.category_id = $1";
    if (q) {
      params.push(`%${q}%`, `%${q}%`);
      where += ` AND (b.title ILIKE $${params.length-1} OR b.author ILIKE $${params.length})`;
    }
    if (available === "true" || available === "false") {
      params.push(available === "true");
      where += ` AND (COALESCE(b.stock,0) > 0) = $${params.length}`;
    }

    const countQ = pool.query(`SELECT COUNT(*)::int AS total FROM books b WHERE ${where}`, params);
    const listQ = pool.query(
      `SELECT b.id, b.title, b.author, b.cover_url, (COALESCE(b.stock,0) > 0) AS available
       FROM books b
       WHERE ${where}
       ORDER BY ${sort} ${order}
       LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      params.concat([pageSize, offset])
    );

    const [countRes, listRes] = await Promise.all([countQ, listQ]);
    res.json({ items: listRes.rows, total: countRes.rows[0].total, page, pageSize });
  } catch (e) { next(e); }
};
