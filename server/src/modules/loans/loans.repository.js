// server/src/modules/loans/loans.repository.js
const db = require('../../db'); // ajusta a tu helper real

async function insertLoan(payload) {
  const fields = [
    'book_id','role','num_control','nombre_completo','correo','carrera','sexo',
    'staff_id','station_id','ip','fecha_prestamo','fecha_compromiso','estado',
    'estado_salida','notas_condicion'
  ];
  const cols = fields.join(',');
  const params = fields.map((_,i)=>`$${i+1}`).join(',');
  const values = fields.map(k => payload[k] ?? null);
  const sql = `INSERT INTO loans(${cols}) VALUES(${params}) RETURNING *;`;
  const { rows } = await db.query(sql, values);
  return rows[0];
}

async function updateOnReturn(loanId, { fecha_devolucion, dias_retraso, multa_calculada, multa_pagada, estado_devolucion, notas_condicion }) {
  const { rows } = await db.query(
    `UPDATE loans SET
       fecha_devolucion = $2,
       dias_retraso = $3,
       multa_calculada = $4,
       multa_pagada = COALESCE($5, multa_pagada),
       estado_devolucion = COALESCE($6, estado_devolucion),
       notas_condicion = COALESCE($7, notas_condicion),
       estado = CASE WHEN COALESCE($5,false) = true OR $4 = 0 THEN 'devuelto' ELSE 'vencido' END,
       updated_at = NOW()
     WHERE loan_id = $1 RETURNING *;`,
    [loanId, fecha_devolucion, dias_retraso, multa_calculada, multa_pagada, estado_devolucion, notas_condicion]
  );
  return rows[0];
}

async function incrementRenewal(loanId, { nueva_fecha_compromiso }) {
  const { rows } = await db.query(
    `UPDATE loans SET renovaciones_count = renovaciones_count+1, fecha_compromiso = $2, updated_at = NOW() WHERE loan_id = $1 RETURNING *;`,
    [loanId, nueva_fecha_compromiso]
  );
  return rows[0];
}

async function findLoans({ page=1, limit=20, estado, role, num_control, isbn, from, to, periodTerm, periodYear }) {
  const offset = (page-1)*limit;
  const where = [];
  const params = [];
  if (estado) { params.push(estado); where.push(`estado = $${params.length}`); }
  if (role) { params.push(role); where.push(`role = $${params.length}`); }
  if (num_control) { params.push(num_control); where.push(`num_control ILIKE '%'||$${params.length}||'%'`); }
  if (from) { params.push(from); where.push(`fecha_prestamo::date >= $${params.length}`); }
  if (to) { params.push(to); where.push(`fecha_prestamo::date <= $${params.length}`); }
  if (isbn) { params.push(isbn); where.push(`book_id IN (SELECT id FROM books WHERE isbn10=$${params.length} OR isbn13=$${params.length})`); }
  if (periodTerm && periodYear) {
    params.push(periodYear, periodTerm);
    where.push(`fecha_prestamo::date BETWEEN (SELECT start_date FROM academic_periods WHERE year=$${params.length-1} AND term=$${params.length}) AND (SELECT end_date FROM academic_periods WHERE year=$${params.length-1} AND term=$${params.length})`);
  }
  const whereSQL = where.length?`WHERE ${where.join(' AND ')}`:'';
  const sql = `SELECT * FROM loans ${whereSQL} ORDER BY fecha_prestamo DESC LIMIT ${limit} OFFSET ${offset};`;
  const { rows } = await db.query(sql, params);
  return rows;
}

async function getAggregates({ from, to }) {
  const params = [];
  let whereSQL = '';
  if (from) { params.push(from); whereSQL += (whereSQL?' AND ':' WHERE ') + `fecha_prestamo::date >= $${params.length}`; }
  if (to) { params.push(to); whereSQL += (whereSQL?' AND ':' WHERE ') + `fecha_prestamo::date <= $${params.length}`; }

  const result = {};
  const total = await db.query(`SELECT COUNT(*)::int AS total FROM loans ${whereSQL};`, params);
  result.total = total.rows[0].total;
  const byRole = await db.query(`SELECT role, COUNT(*)::int c FROM loans ${whereSQL} GROUP BY role;`, params);
  result.byRole = byRole.rows;
  const byEstado = await db.query(`SELECT estado, COUNT(*)::int c FROM loans ${whereSQL} GROUP BY estado;`, params);
  result.byEstado = byEstado.rows;
  const multas = await db.query(`SELECT COALESCE(SUM(CASE WHEN multa_pagada THEN multa_calculada ELSE 0 END),0)::numeric AS recaudado, COALESCE(SUM(CASE WHEN NOT multa_pagada THEN multa_calculada ELSE 0 END),0)::numeric AS pendiente FROM loans ${whereSQL};`, params);
  result.fines = multas.rows[0];
  const genero = await db.query(`SELECT COALESCE(sexo,'N/A') AS sexo, COUNT(*)::int c FROM loans ${whereSQL} GROUP BY COALESCE(sexo,'N/A');`, params);
  result.byGenero = genero.rows;
  return result;
}

async function getById(id) {
  const { rows } = await db.query(`SELECT * FROM loans WHERE loan_id = $1`, [id]);
  return rows[0] || null;
}

module.exports = { insertLoan, updateOnReturn, incrementRenewal, findLoans, getAggregates, getById };
