// ISBN utils
export const normalizeISBN = (isbn = "") => isbn.replace(/[-\s]/g, "").trim();

export const splitIsbn = (raw = "") => {
  const norm = normalizeISBN(raw);
  if (!norm) return { isbn13: null, isbn10: null };
  if (norm.length === 13) return { isbn13: norm, isbn10: null };
  if (norm.length === 10) return { isbn13: null, isbn10: norm };
  return { isbn13: null, isbn10: null };
};

