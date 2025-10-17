// server/lib/loans/repository.js
import { pool } from "../../db/pool.js";

/** Mapea una fila de DB al shape de API */
function mapLoanRow(r) {
  if (!r) return null;

  const book_title = r.book_title ?? r.book_title_join ?? null;
  const isbn10 = r.isbn10 ?? r.isbn10_join ?? null;
  const isbn13 = r.isbn13 ?? r.isbn13_join ?? null;
  const returned = r.returned ?? (r.fecha_devolucion ? true : false);
  const fine = r.multa_calculada ?? r.fine ?? 0;

  return {
    loan_id: r.loan_id,
    role: r.role,
    nombre_completo: r.nombre_completo,
    num_control: r.num_control,
    correo: r.correo,
    carrera: r.carrera,
    sexo: r.sexo ?? null,

    book_id: r.book_id,
    book_title,
    isbn10,
    isbn13,

    start_date: r.fecha_prestamo,
    due_date: r.fecha_compromiso,
    return_date: r.fecha_devolucion ?? null,
    returned,
    fine,
    estado: r.estado,

    estado_salida: r.estado_salida ?? null,
    notas_condicion: r.notas_condicion ?? null,

    staff_id: r.staff_id ?? null,
    station_id: r.station_id ?? null,
    ip: r.ip ?? null,

    renovaciones_count: r.renovaciones_count ?? 0,
    dias_retraso: r.dias_retraso ?? null,
    multa_pagada: r.multa_pagada ?? false,
  };
}

export async function insertLoan(payload){
  const {
    book_id,
    role,
    num_control,
    nombre_completo,
    correo,
    carrera,
    sexo,
    staff_id,
    station_id,
    ip,
    fecha_prestamo,
    fecha_compromiso,
    estado,
    estado_salida,
    notas_condicion,
    book_title,
    isbn10,
    isbn13,
  } = payload;

  const q = `
    INSERT INTO loans (
      book_id, role, num_control, nombre_completo, correo, carrera, sexo,
      staff_id, station_id, ip, fecha_prestamo, fecha_compromiso, estado,
      estado_salida, notas_condicion, book_title, isbn10, isbn13,
      renovaciones_count, multa_calculada, multa_pagada, returned
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,
      $8,$9,$10,$11,$12,$13,
      $14,$15,$16,$17,$18,
      0, 0, false, false
    )
    RETURNING *;
  `;

  const params = [
    book_id, role, num_control, nombre_completo, correo, carrera, sexo ?? null,
    staff_id ?? null, station_id ?? null, ip ?? null, fecha_prestamo, fecha_compromiso, estado,
    estado_salida ?? null, notas_condicion ?? null, book_title ?? null, isbn10 ?? null, isbn13 ?? null
  ];

  const r = await pool.query(q, params);
  return mapLoanRow(r.rows[0]);
}

export async function getById(id){
  const q = `
    SELECT
      l.*,
      b.title AS book_title_join,
      b.isbn10 AS isbn10_join,
      b.isbn13 AS isbn13_join
    FROM loans l
    LEFT JOIN books b ON b.id = l.book_id
    WHERE l.loan_id = $1
    LIMIT 1
  `;
  const r = await pool.query(q, [id]);
  return mapLoanRow(r.rows[0]);
}

export async function findLoans({
  page = 1,
  limit = 20,
  estado,
  role,
  num_control,
  isbn,
  from,
  to,
  periodTerm,
  periodYear,
}) {
  const where = [];
  const params = [];
  let i = 1;

  if (estado) { where.push(`l.estado = $${i++}`); params.push(estado); }
  if (role) { where.push(`l.role = $${i++}`); params.push(role); }
  if (num_control) { where.push(`l.num_control = $${i++}`); params.push(num_control); }

  if (isbn) {
    where.push(`(
      regexp_replace(UPPER(COALESCE(l.isbn10, '')), '[^0-9X]', '', 'g') = regexp_replace(UPPER($${i}), '[^0-9X]', '', 'g')
      OR regexp_replace(UPPER(COALESCE(l.isbn13, '')), '[^0-9X]', '', 'g') = regexp_replace(UPPER($${i}), '[^0-9X]', '', 'g')
      OR regexp_replace(UPPER(COALESCE(b.isbn10, '')), '[^0-9X]', '', 'g') = regexp_replace(UPPER($${i}), '[^0-9X]', '', 'g')
      OR regexp_replace(UPPER(COALESCE(b.isbn13, '')), '[^0-9X]', '', 'g') = regexp_replace(UPPER($${i}), '[^0-9X]', '', 'g')
    )`);
    params.push(isbn);
    i++;
  }

  if (from) { where.push(`l.fecha_prestamo >= $${i++}`); params.push(from); }
  if (to) { where.push(`l.fecha_prestamo < $${i++}`); params.push(to); }

  const whereSql = where.length ? `WHERE ${' ' + where.join(' AND ')}` : '';
  const offset = (Math.max(1, page) - 1) * Math.max(1, limit);

  const q = `
    SELECT
      l.*,
      b.title AS book_title_join,
      b.isbn10 AS isbn10_join,
      b.isbn13 AS isbn13_join
    FROM loans l
    LEFT JOIN books b ON b.id = l.book_id
    ${whereSql}
    ORDER BY l.fecha_prestamo DESC, l.loan_id DESC
    LIMIT ${Math.max(1, limit)} OFFSET ${Math.max(0, offset)}
  `;

  const r = await pool.query(q, params);
  return r.rows.map(mapLoanRow);
}

export async function updateOnReturn(loanId, patch) {
  const {
    fecha_devolucion,
    dias_retraso,
    multa_calculada,
    multa_pagada,
    estado_devolucion,
    notas_condicion,
  } = patch;

  const q = `
    UPDATE loans SET
      fecha_devolucion = $1,
      dias_retraso = $2,
      multa_calculada = $3,
      multa_pagada = $4,
      estado = 'devuelto',
      estado_devolucion = COALESCE($5, estado_devolucion),
      notas_condicion = COALESCE($6, notas_condicion),
      returned = true
    WHERE loan_id = $7
    RETURNING
      *,
      (SELECT title FROM books WHERE id = loans.book_id) AS book_title_join,
      (SELECT isbn10 FROM books WHERE id = loans.book_id) AS isbn10_join,
      (SELECT isbn13 FROM books WHERE id = loans.book_id) AS isbn13_join
  `;

  const params = [
    fecha_devolucion,
    dias_retraso ?? null,
    multa_calculada ?? 0,
    !!multa_pagada,
    estado_devolucion ?? null,
    notas_condicion ?? null,
    loanId,
  ];

  const r = await pool.query(q, params);
  return mapLoanRow(r.rows[0]);
}

export async function incrementRenewal(loanId, patch) {
  const { nueva_fecha_compromiso } = patch;
  const q = `
    UPDATE loans SET
      renovaciones_count = COALESCE(renovaciones_count, 0) + 1,
      fecha_compromiso = $1,
      estado = 'activo'
    WHERE loan_id = $2
    RETURNING
      *,
      (SELECT title FROM books WHERE id = loans.book_id) AS book_title_join,
      (SELECT isbn10 FROM books WHERE id = loans.book_id) AS isbn10_join,
      (SELECT isbn13 FROM books WHERE id = loans.book_id) AS isbn13_join
  `;
  const r = await pool.query(q, [nueva_fecha_compromiso, loanId]);
  return mapLoanRow(r.rows[0]);
}

export async function getAggregates({ from, to }) {
  const where = [];
  const params = [];
  let i = 1;

  if (from) { where.push(`fecha_prestamo >= $${i++}`); params.push(from); }
  if (to) { where.push(`fecha_prestamo < $${i++}`); params.push(to); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const q = `
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN estado = 'activo'   THEN 1 ELSE 0 END)::int AS activos,
      SUM(CASE WHEN estado = 'vencido'  THEN 1 ELSE 0 END)::int AS vencidos,
      SUM(CASE WHEN estado = 'devuelto' THEN 1 ELSE 0 END)::int AS devueltos,
      SUM(CASE WHEN role = 'alumno' THEN 1 ELSE 0 END)::int AS prestamos_alumnos,
      SUM(CASE WHEN role = 'docente' THEN 1 ELSE 0 END)::int AS prestamos_docentes
    FROM loans
    ${whereSql}
  `;
  const r = await pool.query(q, params);
  return r.rows[0] || {
    total: 0, activos: 0, vencidos: 0, devueltos: 0,
    prestamos_alumnos: 0, prestamos_docentes: 0
  };
}
