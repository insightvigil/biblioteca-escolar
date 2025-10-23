// src/controllers/adminbooks.controller.js
import { pool } from '../db/pool.js';
import { toNull, toIntOrNull } from '../utils/sql-helpers.js';


// GET /api/v1/admin/booksNew
export async function getAllBooksAdmin(req, res, next) {
  try {
    const sql = `
      SELECT
        b.id, b.title, b.author, b.year, b.isbn13, b.isbn10, b.editorial,
        b.volumen_tomo, b.estante, b.nivel, b.paginas, b.idioma,
        b.sinopsis, b.cover_url, b.stock, b.category_id, b.created_at,
        c.name AS category_name
      FROM public.books AS b
      LEFT JOIN public.categories AS c
        ON c.id = b.category_id
      ORDER BY b.created_at DESC
    `;

    const { rows } = await pool.query(sql);
    res.json(rows); // <-- SOLO el array
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