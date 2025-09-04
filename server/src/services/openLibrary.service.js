// Open Library service
// Consulta Open Library por ISBN (10/13) y devuelve metadatos estandarizados.
// Campos: title, author, year, editorial, isbn13, isbn10, paginas, idioma, sinopsis, cover_url
export const getByISBN = async (isbnRaw) => {
  const isbn = isbnRaw.trim();
  const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
  if (!res.ok) throw Object.assign(new Error("ISBN no encontrado"), { status: 404 });
  const data = await res.json();

  // Autor
  let author = "Desconocido";
  if (Array.isArray(data.authors) && data.authors[0]?.key) {
    const ares = await fetch(`https://openlibrary.org${data.authors[0].key}.json`);
    if (ares.ok) {
      const a = await ares.json();
      author = a?.name || author;
    }
  }

  // Año
  const year = data.publish_date ? parseInt(String(data.publish_date).match(/\d{4}/)?.[0]) : null;

  // Editorial (primer publisher si existe)
  let editorial = null;
  if (Array.isArray(data.publishers) && data.publishers.length > 0) {
    editorial = String(data.publishers[0]);
  }

  // ISBNs reportados por la edición
  const isbn13 = Array.isArray(data.isbn_13) ? data.isbn_13[0] : data.isbn13 || (isbn.length === 13 ? isbn : null);
  const isbn10 = Array.isArray(data.isbn_10) ? data.isbn_10[0] : data.isbn10 || (isbn.length === 10 ? isbn : null);

  // Páginas
  const paginas = Number.isInteger(data.number_of_pages) ? data.number_of_pages : null;

  // Idioma(s) -> extraer código de la clave (e.g., "/languages/eng" -> "eng")
  let idioma = null;
  if (Array.isArray(data.languages) && data.languages[0]?.key) {
    const key = data.languages[0].key; // "/languages/eng"
    idioma = key.split("/").pop();     // "eng"
  }

  // Sinopsis / descripción (puede ser string o { value })
  let sinopsis = null;
  if (typeof data.description === "string") sinopsis = data.description;
  else if (data.description?.value) sinopsis = data.description.value;

  // Portada (URL). Intento por ISBN; fallback a cover id cuando exista.
  // Tallas: S, M, L. Usamos L.
  let cover_url = null;
  if (isbn13) cover_url = `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`;
  else if (isbn10) cover_url = `https://covers.openlibrary.org/b/isbn/${isbn10}-L.jpg`;
  if (!cover_url && Array.isArray(data.covers) && data.covers[0]) {
    cover_url = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
  }

  return {
    title: data.title || "Sin título",
    author,
    year,
    editorial,
    isbn13: isbn13 || null,
    isbn10: isbn10 || null,
    paginas,
    idioma,
    sinopsis,
    cover_url
  };
};
