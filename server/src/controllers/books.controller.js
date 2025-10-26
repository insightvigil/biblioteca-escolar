// Books controller
import { pool } from "../db/pool.js";
import { getByISBN } from "../services/openLibrary.service.js";
import { normalizeISBN, splitIsbn } from "../utils/isbn.js";
import { badRequest, notFoundErr } from "../utils/httpErrors.js";


//Mis funciones personalizadas
export async function getLastestAdded(req, res) {
  try {
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 20;
    const sql = `
      SELECT
        id,
        title,
        author,
        cover_url,
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
        stock,
        (stock IS NOT NULL AND stock > 0) AS available
      FROM books
      ORDER BY created_at DESC
      LIMIT $1
    `;
    const { rows } = await pool.query(sql, [limit]);
    res.json(rows);
  } catch (err) {
    console.error('[getLatestBooks] Error:', err);
    res.status(500).json({ message: 'Error obteniendo libros recientes' });
  }
}

/* Get Other Categories */

export async function getBooksGridByCategory(req, res) {
  try {
    const bookLimit = Number(req.query.bookLimit) > 0 ? Number(req.query.bookLimit) : 16;
    const catLimit  = req.query.catLimit ? Number(req.query.catLimit) : null;

    const sql = `
      SELECT
        c.id,
        c.name,
        c.description,
        COALESCE(
          (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'id',          b.id,
                'title',       b.title,
                'author',      b.author,
                'cover_url',   b.cover_url,
                'created_at',  to_char(b.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'stock',       b.stock,
                'available',   (b.stock IS NOT NULL AND b.stock > 0)
              )
              ORDER BY b.title
            )
            FROM (
              SELECT id, title, author, cover_url, created_at, stock
              FROM books
              WHERE category_id = c.id
              ORDER BY title
              LIMIT $1
            ) b
          ),
          '[]'::json
        ) AS books
      FROM categories c
      ORDER BY c.name
      ${catLimit ? 'LIMIT $2' : ''}
    `;

    const params = catLimit ? [bookLimit, catLimit] : [bookLimit];
    const { rows } = await pool.query(sql, params);

    res.json({ categories: rows, meta: { count: rows.length, bookLimit, catLimit } });
  } catch (err) {
    console.error('[getBooksGridByCategory] Error:', err);
    res.status(500).json({ message: 'Error obteniendo libros por categoría' });
  }
}

/* Libros Updated*/
export const getOneNuevo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `
      SELECT
        b.id,
        b.title,
        b.cover_url,
        b.author,
        b.editorial,
        b.paginas,
        b.idioma,
        b.year,
        b.isbn13,
        b.isbn10,
        b.nivel,
        b.estante,
        b.stock,
        b.volumen_tomo,
        b.sinopsis,
        c.name AS categoria,
        c.id AS category_id
      FROM books b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.id = $1
      `,
      [id]
    );

    // Si no se encuentra el libro, lanza un error 404
    if (!rows[0]) {
      throw notFoundErr("Libro no encontrado");
    }

    // Devuelve el objeto del libro encontrado
    res.json(rows[0]);
  } catch (e) {
    // Pasa cualquier error al middleware de manejo de errores
    next(e);
  }
};


// ✅ Obtener todos los libros por categoría (sin límite)
// controllers/books.controller.js
export async function getAllBooksByCategoryId(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de categoría inválido' });
    }

    const sql = `
      SELECT
        c.id,
        c.name,
        c.description,
        COALESCE(
          json_agg(
            json_build_object(
              'id',          b.id,
              'title',       b.title,
              'author',      b.author,
              'cover_url',   b.cover_url,
              -- ISO 8601 con "T" y milisegundos; en UTC para parsing consistente
              'created_at',  to_char(b.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
              'stock',       b.stock,
              'available',   (b.stock IS NOT NULL AND b.stock > 0)
            )
            ORDER BY b.title
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) AS books
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.description
    `;

    const { rows } = await pool.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Respuesta: { id, name, description, books: [{ id, title, author, cover_url, created_at, stock, available }...] }
    return res.json(rows[0]);
  } catch (err) {
    console.error('[getAllBooksByCategoryId] Error:', err);
    return res.status(500).json({ message: 'Error obteniendo los libros de la categoría' });
  }
}


// ...
export async function searchBooks(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 8, 50);

    if (q.length < 2) return res.json([]); // evita consultas vacías

    const { rows } = await pool.query(
      `
      SELECT id, title, author, cover_url
      FROM books
      WHERE
        unaccent(title)    ILIKE unaccent($1)
        OR unaccent(author)   ILIKE unaccent($1)
        OR unaccent(editorial) ILIKE unaccent($1)
        OR isbn10 ILIKE $2
        OR isbn13 ILIKE $2
      ORDER BY title ASC
      LIMIT $3
      `,
      [`%${q}%`, `${q}%`, limit]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
}