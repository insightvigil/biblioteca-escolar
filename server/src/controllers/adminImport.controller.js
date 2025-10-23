// src/controllers/import.controller.js
import { fetchBookByISBN } from '../services/ImportFromOpenLibrary.service.js';

export async function importByISBN(req, res, next) {
  try {
    const { isbn } = req.params;
    const data = await fetchBookByISBN(isbn);
    // Garantiza strings vacíos si faltan (tu form los admite)
    res.json({
      title: data.title || '',
      author: data.author || '',
      editorial: data.editorial || '',
      year: data.year ?? null,
      idioma: data.idioma || '',
      paginas: data.paginas ?? null,
      isbn10: data.isbn10 || '',
      isbn13: data.isbn13 || '',
      cover_url: data.cover_url || '',
      sinopsis: data.sinopsis || ''
    });
  } catch (err) {
    // Mapea errores amables
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Error al importar por ISBN' });
  }
}
