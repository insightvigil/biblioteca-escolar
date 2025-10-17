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

/** Resuelve y devuelve el registro completo del libro */
async function resolveBookRecord({ book, book_id, isbn }) {
  const idIn = book?.id ?? book_id;
  if (idIn) {
    const b = await getBookById(idIn);
    if (b) return b;
  }
  const isbnIn = book?.isbn ?? isbn;
  if (isbnIn) {
    const b = await getBookByIsbn(isbnIn);
    if (b) return b;
  }
  const e = new Error("Debes enviar un ISBN válido (10/13) o un book_id existente");
  e.status = 400;
  throw e;
}

export async function createLoan(payloadIn = {}) {
  const {
    role,
    alumno,
    docente,
    book,
    book_id,
    isbn,
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

  const bookRecord = await resolveBookRecord({ book, book_id, isbn });
  if (!bookRecord) {
    const e = new Error("Libro no encontrado");
    e.status = 404;
    throw e;
  }

  const period = await getCurrentPeriod();
  const holidays = period ? await getHolidays(period.period_id) : [];
  const startDate = new Date();
  const due = computeDueDate({ role, startDate, holidays });

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
    fecha_compromiso: due ? new Date(due).toISOString().slice(0, 10) : null,
    estado: "activo",
    estado_salida: estado_salida ?? book?.estado_salida ?? null,
    notas_condicion: notas_condicion ?? book?.notas_condicion ?? null,
    book_title: bookRecord.book_title ?? null,
    isbn10: bookRecord.isbn10 ?? null,
    isbn13: bookRecord.isbn13 ?? null,
  };

  const inserted = await insertLoan(payload);
  return {
    loan_id: inserted.loan_id,
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
