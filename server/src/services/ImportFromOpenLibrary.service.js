// src/services/openlibrary.service.js
// Obtiene metadatos por ISBN desde Open Library y devuelve SOLO campos bibliográficos
// { title, author, year, editorial, isbn13, isbn10, paginas, idioma, sinopsis, cover_url }

const OL_BASE = 'https://openlibrary.org';

function normLang(input) {
  if (!input) return null;
  const v = String(input).toLowerCase();
  // Normaliza cualquier variante de inglés/español a en/es
  if (v === 'eng' || v === 'en' || v.startsWith('en-') || v.includes('english')) return 'en';
  if (v === 'spa' || v === 'es' || v.startsWith('es-') || v.includes('espa')) return 'es';
  return null; // otras lenguas: dejamos código crudo o null
}

function parseYear(publish_date) {
  if (!publish_date) return null;
  const m = String(publish_date).match(/\b(1[6-9]\d{2}|20\d{2})\b/);
  return m ? Number(m[0]) : null;
}

function buildCoverURL({ isbn13, isbn10, covers }) {
  if (isbn13) return `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`;
  if (isbn10) return `https://covers.openlibrary.org/b/isbn/${isbn10}-L.jpg`;
  if (Array.isArray(covers) && covers[0]) {
    return `https://covers.openlibrary.org/b/id/${covers[0]}-L.jpg`;
  }
  return null;
}

async function safeJSON(res) {
  if (!res?.ok) return null;
  try { return await res.json(); } catch { return null; }
}

export async function fetchBookByISBN(isbnRaw) {
  const isbn = String(isbnRaw || '').trim();
  if (!isbn) {
    const err = new Error('ISBN vacío');
    err.status = 400;
    throw err;
  }

  // 1) Edición por ISBN
  const edRes = await fetch(`${OL_BASE}/isbn/${isbn}.json`, {
    headers: { 'User-Agent': 'TecNM-Biblioteca/1.0 (contacto@example.com)' }
  });
  if (!edRes.ok) {
    const err = new Error('ISBN no encontrado');
    err.status = 404;
    throw err;
  }
  const ed = await edRes.json();

  // 2) Autores enlazados
  let author = 'Desconocido';
  if (Array.isArray(ed.authors) && ed.authors.length) {
    const names = await Promise.all(
      ed.authors
        .filter(a => a?.key)
        .map(async (a) => {
          const aRes = await fetch(`${OL_BASE}${a.key}.json`);
          const aJson = await safeJSON(aRes);
          return aJson?.name || null;
        })
    );
    const clean = names.filter(Boolean);
    if (clean.length) author = clean.join(', ');
  }

  // 3) Año / editorial / páginas / ISBNs
  const year = parseYear(ed.publish_date);
  const editorial = Array.isArray(ed.publishers) && ed.publishers[0]
    ? String(ed.publishers[0])
    : null;

  const isbn13 =
    Array.isArray(ed.isbn_13) ? ed.isbn_13[0] :
    ed.isbn13 ? ed.isbn13 :
    (isbn.length === 13 ? isbn : null);

  const isbn10 =
    Array.isArray(ed.isbn_10) ? ed.isbn_10[0] :
    ed.isbn10 ? ed.isbn10 :
    (isbn.length === 10 ? isbn : null);

  const paginas = Number.isInteger(ed.number_of_pages) ? ed.number_of_pages : null;

  // 4) Idioma
  let idioma = null;
  if (Array.isArray(ed.languages) && ed.languages[0]?.key) {
    const code = ed.languages[0].key.split('/').pop(); // eng, spa, etc.
    idioma = normLang(code) ?? code ?? null;
  }

  // 5) Sinopsis: edición → work
  let sinopsis = null;
  if (typeof ed.description === 'string') sinopsis = ed.description;
  else if (ed.description?.value) sinopsis = ed.description.value;

  if (!sinopsis && Array.isArray(ed.works) && ed.works[0]?.key) {
    const workRes = await fetch(`${OL_BASE}${ed.works[0].key}.json`);
    const work = await safeJSON(workRes);
    if (typeof work?.description === 'string') sinopsis = work.description;
    else if (work?.description?.value) sinopsis = work.description.value;
  }

  // 6) Cover
  const cover_url = buildCoverURL({ isbn13, isbn10, covers: ed.covers });

  // 7) Título (respeta subtitle si quieres concatenarlo)
  const title = ed.title ? String(ed.title) : 'Sin título';
  // const titleFull = ed.subtitle ? `${title}: ${ed.subtitle}` : title;

  // 8) SOLO bibliográficos (nada de estante/nivel/stock/categoría)
  return {
    title,
    author,
    year,
    editorial,
    isbn13: isbn13 || null,
    isbn10: isbn10 || null,
    paginas,
    idioma: idioma ?? null,
    sinopsis: sinopsis ?? null,
    cover_url: cover_url ?? null
  };
}
