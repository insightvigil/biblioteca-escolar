// src/controllers/adminbooks.controller.js
import { pool } from '../db/pool.js';
import { toNull, toIntOrNull } from '../utils/sql-helpers.js';


// GET /api/v1/admin/booksNew
// ✅ Listas blancas y mapeo a columnas reales (evita inyección)
const ALLOWED_SORT = new Set([
  'created_at',
  'title',
  'author',
  'id',
  'stock',
  'category_name', // <-- habilitado
]);

const ALLOWED_ORDER = new Set(['asc', 'desc']);

const ORDER_BY_MAP = {
  created_at: 'b.created_at',
  title:      'b.title',
  author:     'b.author',
  id:         'b.id',
  stock:      'b.stock',
  category_name: 'c.name', // <-- ordena por categoría
};

export async function getAllBooksAdmin(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page ?? '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize ?? '20', 10), 5), 100);

    const sortParam  = (req.query.sort || '').toLowerCase();
    const orderParam = (req.query.order || '').toLowerCase();

    const sort  = ALLOWED_SORT.has(sortParam)  ? sortParam  : 'created_at';
    const order = ALLOWED_ORDER.has(orderParam) ? orderParam : 'desc';

    const sortExpr = ORDER_BY_MAP[sort]; // columna segura
    const q = (req.query.q || '').trim();

    const offset = (page - 1) * pageSize;

    // ------- Filtro de búsqueda básico (incluye categoría) -------
    const whereClauses = [];
    const params = [];
    if (q) {
      params.push(`%${q}%`); // $1
      params.push(`%${q}%`); // $2
      params.push(`%${q}%`); // $3
      whereClauses.push(
        `(b.title ILIKE $${params.length - 2} OR b.author ILIKE $${params.length - 1} OR c.name ILIKE $${params.length})`
      );
    }
    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // ------- Query con paginación y total -------
    const sql = `
      SELECT
        b.id, b.title, b.author, b.year, b.isbn13, b.isbn10, b.editorial,
        b.volumen_tomo, b.estante, b.nivel, b.paginas, b.idioma,
        b.sinopsis, b.cover_url, b.stock, b.category_id, b.created_at,
        c.name AS category_name,
        COUNT(*) OVER() AS __total
      FROM public.books AS b
      LEFT JOIN public.categories AS c ON c.id = b.category_id
      ${whereSQL}
      ORDER BY ${sortExpr} ${order} NULLS LAST
      LIMIT $${params.push(pageSize)} OFFSET $${params.push(offset)}
    `;

    const { rows } = await pool.query(sql, params);
    const total = rows[0]?.__total ? Number(rows[0].__total) : 0;

    res.json({
      items: rows.map(({ __total, ...r }) => r),
      meta: {
        total,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
        sort,
        order,
        q
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/books/:id/edit
export async function getBookForEdit(req, res, next) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: 'Parámetro id inválido' });
    }

    const sql = `
      SELECT
        b.id, b.title, b.author, b.year, b.isbn13, b.isbn10, b.editorial,
        b.volumen_tomo, b.estante, b.nivel, b.paginas, b.idioma,
        b.sinopsis, b.cover_url, b.stock, b.category_id, b.created_at,
        c.name AS category_name
      FROM public.books AS b
      LEFT JOIN public.categories AS c
        ON c.id = b.category_id
      WHERE b.id = $1
      LIMIT 1
    `;

    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    res.json(rows[0]); // ← solo el objeto libro
  } catch (err) {
    next(err);
  }
}

// CREATE
export const createBook = async (req, res) => {
  try {
    const {
      title, author, year, isbn13, isbn10, editorial,
      volumen_tomo, estante, nivel, paginas, idioma,
      sinopsis, cover_url, stock, category_id
    } = req.body || {};

    const values = [
      toNull(title),
      toNull(author),
      toIntOrNull(year),
      toNull(isbn13),
      toNull(isbn10),
      toNull(editorial),
      toNull(volumen_tomo),
      toNull(estante),
      toNull(nivel),
      toIntOrNull(paginas),
      toNull(idioma),
      toNull(sinopsis),
      toNull(cover_url),
      toIntOrNull(stock),
      toIntOrNull(category_id),
    ];

    const { rows } = await pool.query(
      `INSERT INTO public.books
        (title, author, year, isbn13, isbn10, editorial, volumen_tomo, estante, nivel, paginas, idioma, sinopsis, cover_url, stock, category_id)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id, title, author, year, isbn13, isbn10, editorial, volumen_tomo, estante, nivel, paginas, idioma, sinopsis, cover_url, stock, category_id, created_at`,
      values
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al crear libro' });
  }
};

// READ by id (útil para vistas de detalle/edición)
export const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT id, title, author, year, isbn13, isbn10, editorial, volumen_tomo, estante, nivel, paginas, idioma, sinopsis, cover_url, stock, category_id, created_at
       FROM public.books
       WHERE id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Libro no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al obtener libro' });
  }
};

// UPDATE (sobrescribe todo con lo que llegue; si falta algo → NULL)
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title, author, year, isbn13, isbn10, editorial,
      volumen_tomo, estante, nivel, paginas, idioma,
      sinopsis, cover_url, stock, category_id
    } = req.body || {};

    const values = [
      toNull(title),
      toNull(author),
      toIntOrNull(year),
      toNull(isbn13),
      toNull(isbn10),
      toNull(editorial),
      toNull(volumen_tomo),
      toNull(estante),
      toNull(nivel),
      toIntOrNull(paginas),
      toNull(idioma),
      toNull(sinopsis),
      toNull(cover_url),
      toIntOrNull(stock),
      toIntOrNull(category_id),
      id
    ];

    const { rows } = await pool.query(
      `UPDATE public.books SET
        title=$1, author=$2, year=$3, isbn13=$4, isbn10=$5, editorial=$6,
        volumen_tomo=$7, estante=$8, nivel=$9, paginas=$10, idioma=$11,
        sinopsis=$12, cover_url=$13, stock=$14, category_id=$15
       WHERE id=$16
       RETURNING id, title, author, year, isbn13, isbn10, editorial, volumen_tomo, estante, nivel, paginas, idioma, sinopsis, cover_url, stock, category_id, created_at`,
      values
    );

    if (!rows.length) return res.status(404).json({ message: 'Libro no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al actualizar libro' });
  }
};

// DELETE
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `DELETE FROM public.books WHERE id=$1 RETURNING id`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Libro no encontrado' });
    res.json({ id: rows[0].id, deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error al eliminar libro' });
  }
};

// === ISBN helpers ===
const normalizeIsbn = (s='') => (s.replace(/[^0-9Xx]/g,'').toUpperCase())

// GET /api/v1/admin/books/by-isbn/:isbn  (match exacto)
export async function getBookByIsbn(req, res, next) {
  try {
    const raw = req.params.isbn || ''
    const q = normalizeIsbn(raw)
    if (q.length < 10) return res.status(400).json({ message: 'ISBN inválido' })

    const sql = `
      SELECT
        b.id, b.title, b.author, b.year, b.isbn13, b.isbn10, b.editorial,
        b.volumen_tomo, b.estante, b.nivel, b.paginas, b.idioma,
        b.sinopsis, b.cover_url, b.stock, b.category_id, b.created_at,
        c.name AS category_name
      FROM public.books b
      LEFT JOIN public.categories c ON c.id = b.category_id
      WHERE REPLACE(UPPER(COALESCE(b.isbn13,'')),'-','') = $1
         OR REPLACE(UPPER(COALESCE(b.isbn10,'')),'-','') = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [q])
    if (!rows.length) return res.status(404).json({ message: 'No encontrado' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/admin/books/search?q=... (fallback flexible)
export async function searchBooksAdmin(req, res, next) {
  try {
    const qRaw = (req.query.q || '').trim()
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 10)
    if (!qRaw) return res.json([])

    const qNorm = normalizeIsbn(qRaw)
    let rows;

    // Si parece ISBN (>=10 dígitos/letra X), intentamos exacto primero
    if (qNorm.length >= 10) {
      const sql = `
        SELECT b.id, b.title, b.author, b.year, b.isbn13, b.isbn10,
               b.editorial, b.volumen_tomo, b.estante, b.nivel, b.paginas,
               b.idioma, b.sinopsis, b.cover_url, b.stock, b.category_id, b.created_at
          FROM public.books b
         WHERE REPLACE(UPPER(COALESCE(b.isbn13,'')),'-','') = $1
            OR REPLACE(UPPER(COALESCE(b.isbn10,'')),'-','') = $1
         LIMIT $2
      `;
      const r = await pool.query(sql, [qNorm, limit])
      rows = r.rows
      if (rows.length) return res.json(rows)
    }

    // Fallback por título/autor (ILIKE)
    const like = `%${qRaw}%`
    const sql2 = `
      SELECT b.id, b.title, b.author, b.year, b.isbn13, b.isbn10,
             b.editorial, b.volumen_tomo, b.estante, b.nivel, b.paginas,
             b.idioma, b.sinopsis, b.cover_url, b.stock, b.category_id, b.created_at
        FROM public.books b
       WHERE b.title ILIKE $1 OR b.author ILIKE $1
       ORDER BY b.created_at DESC
       LIMIT $2
    `;
    const r2 = await pool.query(sql2, [like, limit])
    res.json(r2.rows)
  } catch (err) {
    next(err)
  }
}