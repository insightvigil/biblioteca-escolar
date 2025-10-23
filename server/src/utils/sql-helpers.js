// src/utils/sql-helpers.js
export const toNull = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return v;
};

export const toIntOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
