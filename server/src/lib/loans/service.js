// server/lib/loans/service.js
import policy from "../loanPolicy.js";
import { getCurrentPeriod, getHolidays } from "./calendar.util.js";
import { computeDueDate, computeFine } from "./fines.util.js";
import { insertLoan, updateOnReturn, incrementRenewal } from "./repository.js";
import { pool } from "../../db/pool.js";

/** Limpia el ISBN (deja solo dígitos y posible X al final) y lo pasa a mayúsculas */
function normalizeIsbn(isbn) {
  if (!isbn) return "";
  return String(isbn).replace(/[^0-9Xx]/g, "").toUpperCase().trim();
}

/** Obtiene registro de libro por ID (solo columnas necesarias para cache) */
async function getBookById(id) {
  if (!id) return null;
  const q = `SELECT id, title AS book_title, isbn10, isbn13 FROM books WHERE id = $1 LIMIT 1`;
  const r = await pool.query(q, [id]);
  return r.rows[0] || null;
}

/** Obtiene registro de libro por ISBN (compara contra isbn10 y isbn13 normalizados) */
async function getBookByIsbn(isbnRaw) {
  const isbn = normalizeIsbn(isbnRaw);
  if (!isbn) return null;

  // Usamos regexp_replace para comparar contra versión "limpia" en DB
  const q = `
    SELECT id, title AS book_title, isbn10, isbn13
    FROM books
    WHERE regexp_replace(UPPER(COALESCE(isbn13, '')), '[^0-9X]', '', 'g') = $1
       OR regexp_replace(UPPER(COALESCE(isbn10, '')), '[^0-9X]', '', 'g') = $1
    LIMIT 1
  `;
  const r = await pool.query(q, [isbn]);
  return r.rows[0] || null;
}

/**
 * Resuelve y devuelve el registro completo del libro.
 * Soporta: book.id | book.isbn | book_id | isbn (en nivel superior).
 */
async function resolveBookRecord({ book, book_id, isbn }) {
  // Prioridad: id explícito
  const idIn = book?.id ?? book_id;
  if (idIn) {
    const byId = await getBookById(idIn);
    if (byId) return byId;
  }

  // Fallback: ISBN
  const isbnIn = book?.isbn ?? isbn;
  if (isbnIn) {
    const byIsbn = await getBookByIsbn(isbnIn);
    if (byIsbn) return byIsbn;
  }

  const e = new Error("Debes enviar un ISBN válido (10/13) o un book_id existente");
  e.status = 400;
  throw e;
}

/**
 * Crea un préstamo resolviendo el libro y denormalizando título/ISBNs.
 * Acepta payload en nivel superior (new.jsx) o anidado (compat).
 *
 * payload:
 * {
 *   role: 'alumno' | 'docente',
 *   isbn?: string,
 *   book_id?: number,
 *   book?: { id?, isbn?, estado_salida?, notas_condicion? } // compat
 *   alumno?: { num_control, nombre_completo, carrera, sexo? }
 *   docente?: { nombre_completo, correo, sexo? }
 *   estado_salida?: 'bueno'|'regular'|'malo',
 *   notas_condicion?: string,
 *   staff?: { id?, nombre? },
 *   station?: { id?, nombre?, ip? }
 * }
 */
export async function createLoan(payloadIn = {}) {
  const {
    role,
    alumno,
    docente,
    book,                // compat
    book_id,             // nuevo (nivel superior)
    isbn,                // nuevo (nivel superior)
    staff,
    station,
    estado_salida,
    notas_condicion,
  } = payloadIn;

  if (!role) {
    const e = new Error("role es requerido: 'alumno' o 'docente'");
    e.status = 400;
    throw e;
  }

  // 1) Validar datos de usuario por rol
  let nombre_completo, correo, num_control = null, carrera = null, sexo = null;

  if (role === "alumno") {
    if (!alumno?.num_control || !alumno?.nombre_completo || !alumno?.carrera) {
      const e = new Error("Para 'alumno' se requieren num_control, nombre_completo y carrera");
      e.status = 400;
      throw e;
    }
    nombre_completo = alumno.nombre_completo;
    num_control = alumno.num_control;
    carrera = alumno.carrera;
    correo = `${num_control}@atitalaquia.tecnm.mx`;
    sexo = alumno?.sexo ?? null;
  } else if (role === "docente") {
    if (!docente?.nombre_completo || !docente?.correo) {
      const e = new Error("Para 'docente' se requieren nombre_completo y correo");
      e.status = 400;
      throw e;
    }
    nombre_completo = docente.nombre_completo;
    correo = docente.correo;
    sexo = docente?.sexo ?? null;
  } else {
    const e = new Error("role inválido");
    e.status = 400;
    throw e;
  }

  // 2) Resolver libro (acepta id/ISBN en nivel superior o en book.*)
  const bookRecord = await resolveBookRecord({ book, book_id, isbn });
  if (!bookRecord) {
    const e = new Error("Libro no encontrado");
    e.status = 404;
    throw e;
  }

  // 3) Periodo + festivos para calcular fecha compromiso
  const period = await getCurrentPeriod();
  const holidays = period ? await getHolidays(period.period_id) : [];
  const startDate = new Date();
  const due = computeDueDate({ role, startDate, holidays });

  // 4) Construir payload para insertar (con denormalización útil)
  const payload = {
    book_id: bookRecord.id,
    role,
    num_control,
    nombre_completo,
    correo,
    carrera,
    sexo: sexo ?? null,
    staff_id: staff?.id ?? null,
    station_id: station?.id ?? null,
    ip: station?.ip ?? null,
    fecha_prestamo: startDate,
    // Guardamos YYYY-MM-DD (como ya hacías)
    fecha_compromiso: due ? new Date(due).toISOString().slice(0, 10) : null,
    estado: "activo",
    // Condición propia de este préstamo (preferir nivel superior; fallback a book.* por compat)
    estado_salida: estado_salida ?? book?.estado_salida ?? null,
    notas_condicion: notas_condicion ?? book?.notas_condicion ?? null,
    // Cache de libro para listados/reportes rápidos SIN JOIN
    book_title: bookRecord.book_title ?? null,
    isbn10: bookRecord.isbn10 ?? null,
    isbn13: bookRecord.isbn13 ?? null,
  };

  // 5) Insertar
  const inserted = await insertLoan(payload);
  // insertLoan puede devolver el registro completo o solo el id.
  const loan_id = inserted?.loan_id ?? inserted?.id ?? inserted;

  // 6) Devolver respuesta consistente
  return {
    loan_id,
    role,
    nombre_completo,
    num_control,
    correo,
    carrera,
    sexo: payload.sexo,
    start_date: payload.fecha_prestamo,
    due_date: payload.fecha_compromiso,
    return_date: null,
    returned: false,
    fine: 0,
    estado: "activo",
    book_id: payload.book_id,
    book_title: payload.book_title,
    isbn10: payload.isbn10,
    isbn13: payload.isbn13,
    estado_salida: payload.estado_salida,
    notas_condicion: payload.notas_condicion,
  };
}

export async function returnLoan({ loan, registrarPago = false, estado_devolucion, notas_condicion }) {
  const dueDate = loan.fecha_compromiso ? new Date(loan.fecha_compromiso) : null;
  const { delayDays, fine } = computeFine({ dueDate, returnDate: new Date() });
  return updateOnReturn(loan.loan_id, {
    fecha_devolucion: new Date(),
    dias_retraso: delayDays,
    multa_calculada: fine,
    multa_pagada: registrarPago ? true : loan.multa_pagada,
    estado_devolucion,
    notas_condicion,
  });
}

export async function renewLoan({ loan }) {
  if (loan.renovaciones_count >= policy.renewals.maxTimes) {
    const err = new Error("Límite de renovaciones alcanzado");
    err.status = 400;
    throw err;
  }
  const days = policy.renewals.daysPerRenewal;
  const base = loan.fecha_compromiso ? new Date(loan.fecha_compromiso) : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return incrementRenewal(loan.loan_id, {
    nueva_fecha_compromiso: next.toISOString().slice(0, 10),
  });
}
