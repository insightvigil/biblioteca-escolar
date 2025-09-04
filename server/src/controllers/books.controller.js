// Books controller
import { pool } from "../db/pool.js";
import { getByISBN } from "../services/openLibrary.service.js";
import { normalizeISBN, splitIsbn } from "../utils/isbn.js";
import { badRequest, notFoundErr } from "../utils/httpErrors.js";

export const search = async (req, res, next) => {
  try {
    const q = (req.query.q ?? "").trim();
    const page = Math.max(parseInt(req.query.page ?? 1), 1);
    const pageSize = Math.min(parseInt(req.query.limit ?? 20), 100);
    const offset = (page - 1) * pageSize;
    const available = req.query.available;
    const allowedSort = new Set(["title","created_at","author"]);
    const sort = allowedSort.has(req.query.sort) ? req.query.sort : "title";
    const order = req.query.order === "desc" ? "DESC" : "ASC";
    const category_id = req.query.category_id;

    const params = [];
    let where = "TRUE";
    if (q) {
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      where += ` AND (b.title ILIKE $${params.length-3} OR b.author ILIKE $${params.length-2} OR b.isbn13 ILIKE $${params.length-1} OR b.isbn10 ILIKE $${params.length})`;
    }
    if (category_id) {
      params.push(category_id);
      where += ` AND b.category_id = $${params.length}`;
    }
    if (available === "true" || available === "false") {
      params.push(available === "true");
      where += ` AND (COALESCE(b.stock,0) > 0) = $${params.length}`;
    }

    const countQ = pool.query(`SELECT COUNT(*)::int AS total FROM books b WHERE ${where}`, params);
    const listQ = pool.query(
      `SELECT b.id, b.title, b.author, b.cover_url, (COALESCE(b.stock,0) > 0) AS available, b.category_id
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

export const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT b.*, c.name AS category
       FROM books b LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.id = $1`, [id]
    );
    if (!rows[0]) throw notFoundErr("Libro no encontrado");
    res.json(rows[0]);
  } catch (e) { next(e); }
};

export const createManual = async (req, res, next) => {
  try {
    let {
      title, author, year,
      isbn, isbn13, isbn10,
      editorial, volumen_tomo,
      estante, nivel,
      paginas, idioma, sinopsis, cover_url,
      stock = 1, category_id = null
    } = req.body;

    if (!title?.trim()) throw badRequest("El título es obligatorio");

    // Permite enviar un solo 'isbn' o ambos isbn13/isbn10
    if (isbn && (!isbn13 && !isbn10)) {
      const split = splitIsbn(isbn);
      isbn13 = split.isbn13;
      isbn10 = split.isbn10;
    }
    if (isbn13) isbn13 = normalizeISBN(isbn13);
    if (isbn10) isbn10 = normalizeISBN(isbn10);

    const { rows } = await pool.query(
      `INSERT INTO books(
        title, author, year,
        isbn13, isbn10, editorial, volumen_tomo,
        estante, nivel, paginas, idioma, sinopsis, cover_url,
        stock, category_id
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [
        title.trim(),
        author || "Desconocido",
        year || null,
        isbn13 || null, isbn10 || null, editorial || null, volumen_tomo || null,
        estante || null, nivel || null, paginas || null, idioma || null, sinopsis || null, cover_url || null,
        stock, category_id
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

// Importación por ISBN con posibilidad de override manual (si el cliente envía campos, se respetan)
export const importByISBN = async (req, res, next) => {
  try {
    let {
      isbn, category_id = null, stock = 1,
      volumen_tomo = null, estante = null, nivel = null,
      paginas = null, idioma = null, sinopsis = null, cover_url = null, editorial = null
    } = req.body;
    if (!isbn) throw badRequest("ISBN requerido");

    // Datos base desde OL
    const ol = await getByISBN(normalizeISBN(isbn));

    // Permitir override manual (si el front manda el campo, tiene prioridad)
    const merged = {
      title: ol.title,
      author: ol.author,
      year: ol.year,
      editorial: editorial ?? ol.editorial ?? null,
      isbn13: ol.isbn13 ?? null,
      isbn10: ol.isbn10 ?? null,
      paginas: paginas ?? ol.paginas ?? null,
      idioma: idioma ?? ol.idioma ?? null,
      sinopsis: sinopsis ?? ol.sinopsis ?? null,
      cover_url: cover_url ?? ol.cover_url ?? null,
      volumen_tomo, estante, nivel, stock, category_id
    };

    // Upsert por isbn13; si no existe, por isbn10
    let result = await pool.query(
      `INSERT INTO books(
        title, author, year,
        isbn13, isbn10, editorial, volumen_tomo,
        estante, nivel, paginas, idioma, sinopsis, cover_url,
        stock, category_id
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (isbn13) DO UPDATE SET
        title = EXCLUDED.title,
        author = EXCLUDED.author,
        year = EXCLUDED.year,
        editorial = EXCLUDED.editorial,
        volumen_tomo = COALESCE(EXCLUDED.volumen_tomo, books.volumen_tomo),
        estante = COALESCE(EXCLUDED.estante, books.estante),
        nivel = COALESCE(EXCLUDED.nivel, books.nivel),
        paginas = COALESCE(EXCLUDED.paginas, books.paginas),
        idioma = COALESCE(EXCLUDED.idioma, books.idioma),
        sinopsis = COALESCE(EXCLUDED.sinopsis, books.sinopsis),
        cover_url = COALESCE(EXCLUDED.cover_url, books.cover_url),
        stock = EXCLUDED.stock,
        category_id = COALESCE(EXCLUDED.category_id, books.category_id)
      RETURNING *`,
      [
        merged.title, merged.author, merged.year,
        merged.isbn13, merged.isbn10, merged.editorial, merged.volumen_tomo,
        merged.estante, merged.nivel, merged.paginas, merged.idioma, merged.sinopsis, merged.cover_url,
        merged.stock, merged.category_id
      ]
    );

    if (!result.rows[0] && merged.isbn10) {
      result = await pool.query(
        `INSERT INTO books(
          title, author, year,
          isbn13, isbn10, editorial, volumen_tomo,
          estante, nivel, paginas, idioma, sinopsis, cover_url,
          stock, category_id
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (isbn10) DO UPDATE SET
          title = EXCLUDED.title,
          author = EXCLUDED.author,
          year = EXCLUDED.year,
          editorial = EXCLUDED.editorial,
          volumen_tomo = COALESCE(EXCLUDED.volumen_tomo, books.volumen_tomo),
          estante = COALESCE(EXCLUDED.estante, books.estante),
          nivel = COALESCE(EXCLUDED.nivel, books.nivel),
          paginas = COALESCE(EXCLUDED.paginas, books.paginas),
          idioma = COALESCE(EXCLUDED.idioma, books.idioma),
          sinopsis = COALESCE(EXCLUDED.sinopsis, books.sinopsis),
          cover_url = COALESCE(EXCLUDED.cover_url, books.cover_url),
          stock = EXCLUDED.stock,
          category_id = COALESCE(EXCLUDED.category_id, books.category_id)
        RETURNING *`,
        [
          merged.title, merged.author, merged.year,
          merged.isbn13, merged.isbn10, merged.editorial, merged.volumen_tomo,
          merged.estante, merged.nivel, merged.paginas, merged.idioma, merged.sinopsis, merged.cover_url,
          merged.stock, merged.category_id
        ]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    let {
      title, author, year,
      isbn13, isbn10, editorial, volumen_tomo,
      estante, nivel, paginas, idioma, sinopsis, cover_url,
      stock, category_id
    } = req.body;

    if (isbn13) isbn13 = normalizeISBN(isbn13);
    if (isbn10) isbn10 = normalizeISBN(isbn10);

    const { rows } = await pool.query(
      `UPDATE books SET
        title=$1, author=$2, year=$3,
        isbn13=$4, isbn10=$5, editorial=$6, volumen_tomo=$7,
        estante=$8, nivel=$9, paginas=$10, idioma=$11, sinopsis=$12, cover_url=$13,
        stock=$14, category_id=$15
       WHERE id=$16 RETURNING *`,
      [
        title, author, year || null,
        isbn13 || null, isbn10 || null, editorial || null, volumen_tomo || null,
        estante || null, nivel || null, paginas || null, idioma || null, sinopsis || null, cover_url || null,
        stock, category_id || null, id
      ]
    );
    if (!rows[0]) throw notFoundErr("Libro no encontrado");
    res.json(rows[0]);
  } catch (e) { next(e); }
};

export const remove = async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM books WHERE id=$1", [id]);
  res.status(204).end();
};
