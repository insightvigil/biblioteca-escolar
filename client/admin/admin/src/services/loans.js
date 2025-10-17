// services/loans.js
import { api } from './api.js'

const clean = (obj = {}) => {
  const out = {}
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) out[k] = v
  })
  return out
}

export async function fetchLoans(params = {}) {
  const r = await api.get('/admin/loans', { params: clean(params) })
  const loans = r.data?.data ?? []

  // **CAMBIO CLAVE**: Procesamos cada préstamo para normalizar los datos
  // Esto asegura que la info del libro (si viene) esté en el nivel superior.
  return loans.map(d => ({
    ...d,
    // Aseguramos que las propiedades principales existan
    loan_id: d.loan_id ?? d.id,
    book_title: d.book_title ?? d.book?.title,
    // Extraemos los ISBN del objeto anidado 'book' si existe, o del nivel superior
    isbn10: d.isbn10 ?? d.book?.isbn10,
    isbn13: d.isbn13 ?? d.book?.isbn13,
    start_date: d.start_date ?? d.fecha_prestamo ?? d.created_at,
    due_date: d.due_date ?? d.fecha_compromiso,
  }))
}

export async function fetchLoanAggregates(params = {}) {
  const r = await api.get('/admin/loans/reports/aggregates', { params: clean(params) })
  return r.data ?? null
}

export async function fetchLoanById(id) {
  const r = await api.get(`/admin/loans/${id}`)
  const d = r.data ?? {}

  // Entidades posibles
  const alumno = d.alumno || d.student || {}
  const docente = d.docente || d.teacher || {}
  let book = d.book || {}

  const loan_id = d.loan_id ?? d.id ?? id
  const role = d.role ?? d.rol ?? (alumno?.num_control ? 'alumno' : 'docente')

  const num_control = d.num_control ?? alumno.num_control ?? null
  const nombre_completo =
    d.nombre_completo ?? alumno.nombre_completo ?? docente.nombre_completo ?? null

  const correo =
    d.correo ??
    alumno.correo ??
    docente.correo ??
    (alumno.num_control ? `${alumno.num_control}@atitalaquia.tecnm.mx` : null)

  const carrera = d.carrera ?? alumno.carrera ?? null

  const start_date = d.start_date ?? d.fecha_inicio ?? d.created_at ?? null
  const due_date = d.due_date ?? d.fecha_compromiso ?? d.compromiso ?? null
  const return_date = d.return_date ?? d.fecha_devolucion ?? d.returned_at ?? null

  const returned = d.returned ?? d.devuelto ?? Boolean(return_date)
  const fine = d.fine ?? d.multa_calculada ?? d.multa ?? 0

  const book_id = d.book_id ?? (book && book.id) ?? null

  if (book_id && (!book.title || (!book.isbn10 && !book.isbn13))) {
    try {
      const br = await api.get(`/admin/books/${book_id}`)
      if (br?.data) book = br.data
    } catch (_) {
      // continuar aunque falle
    }
  }

  const book_title = d.book_title ?? book.title ?? null
  const isbn10 = d.isbn10 ?? book.isbn10 ?? null
  const isbn13 = d.isbn13 ?? book.isbn13 ?? null

  let estado = d.estado
  if (!estado) {
    if (returned) estado = 'devuelto'
    else if (due_date && new Date(due_date) < new Date()) estado = 'vencido'
    else estado = 'activo'
  }

  let days_overdue = null
  if (due_date) {
    const due = new Date(due_date)
    const ref = returned ? (return_date ? new Date(return_date) : new Date()) : new Date()
    const diff = ref.getTime() - due.getTime()
    days_overdue = diff > 0 ? Math.floor(diff / 86400000) : 0
  }

  return {
    loan_id,
    role,
    nombre_completo,
    num_control,
    correo,
    carrera,
    start_date,
    due_date,
    return_date,
    returned,
    fine,
    estado,
    book_id,
    book_title,
    isbn10,
    isbn13,
    days_overdue,
    fecha_compromiso: due_date,
    multa_calculada: fine,
  }
}

export async function createLoan(payload) {
  const r = await api.post('/admin/loans', payload)
  return r.data ?? null
}

export async function renewLoan(id) {
  const r = await api.post(`/admin/loans/${id}/renew`)
  return r.data ?? null
}

export async function returnLoan(id, body = {}) {
  const r = await api.post(`/admin/loans/${id}/return`, body)
  return r.data ?? null
}