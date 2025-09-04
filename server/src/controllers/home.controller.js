// Home controller
import { pool } from "../db/pool.js";

export const home = async (req, res, next) => {
  try {
    const catLimit = Math.min(parseInt(req.query.catLimit ?? 10), 50);
    const bookLimit = Math.min(parseInt(req.query.bookLimit ?? 16), 50);

    const catsQ = pool.query(
      "SELECT id, name FROM categories ORDER BY name LIMIT $1",
      [catLimit]
    );
    const booksQ = pool.query(
      `SELECT id, title, author, cover_url, category_id
       FROM books
       ORDER BY created_at DESC NULLS LAST, id DESC
       LIMIT $1`,
      [bookLimit]
    );

    const [cats, books] = await Promise.all([catsQ, booksQ]);
    res.json({
      featuredCategories: cats.rows,
      latestBooks: books.rows
    });
  } catch (e) { next(e); }
};
