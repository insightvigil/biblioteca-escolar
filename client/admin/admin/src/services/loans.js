// services/loans.js
import { api } from './api.js'

const clean = (obj = {}) => {
  const out = {}
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) out[k] = v
  })
  return out
}

// ---------- Normalizadores ----------
const readState = (d) =>
  d?.estado ?? d?.loan_state ?? d?.status ?? d?.state ?? null

const readCount = (x) =>
  x?.c ?? x?.count ?? x?.total ?? x?.n ?? 0

const normalizeAgg = (raw = {}) => {
  // total
  const total =
    Number(raw.total ?? raw.count ?? raw.total_count ?? raw.totalLoans ?? 0)

  // fines
  const finesRaw = raw.fines ?? raw.moras ?? {}
  const fines = {
    recaudado: Number(finesRaw.recaudado ?? finesRaw.collected ?? 0),
    pendiente: Number(finesRaw.pendiente ?? finesRaw.pending ?? 0),
  }

  // byEstado puede venir como array o como objeto-mapa
  let arr = null
  const anyArray =
    (Array.isArray(raw.byEstado) && raw.byEstado) ||
    (Array.isArray(raw.by_state) && raw.by_state) ||
    (Array.isArray(raw.byStatus) && raw.byStatus) ||
    (Array.isArray(raw.by) && raw.by)

  const anyMap =
    (!Array.isArray(raw.byEstado) && typeof raw.byEstado === 'object' && raw.byEstado) ||
    (!Array.isArray(raw.by_state) && typeof raw.by_state === 'object' && raw.by_state) ||
    (!Array.isArray(raw.byStatus) && typeof raw.byStatus === 'object' && raw.byStatus) ||
    (!Array.isArray(raw.counts) && typeof raw.counts === 'object' && raw.counts)

  if (anyArray) {
    arr = anyArray
      .map((x) => ({
        estado: x?.estado ?? x?.loan_state ?? x?.status ?? x?.state ?? null,
        c: Number(readCount(x)) || 0,
      }))
      .filter((x) => x.estado)
  } else if (anyMap) {
    const mapObj =
      raw.byEstado ?? raw.by_state ?? raw.byStatus ?? raw.counts
    arr = Object.entries(mapObj).map(([k, v]) => ({
      estado: k,
      c: Number(v) || 0,
    }))
  } else {
    arr = []
  }

  return { total, byEstado: arr, fines }
}

// ---------- Servicios ----------

// Lista de préstamos
export async function fetchLoans(params = {}) {
  const r = await api.get('/admin/loans', { params: clean(params) })
  const loans = r.data?.data ?? r.data ?? []
  return (Array.isArray(loans) ? loans : []).map((d) => ({
    ...d,
    loan_id: d.loan_id ?? d.id,
    start_date: d.start_date ?? d.fecha_prestamo ?? d.created_at ?? null,
    due_date: d.due_date ?? d.fecha_compromiso ?? null,
    return_date: d.return_date ?? d.fecha_devolucion ?? null,
    book_title: d.book_title ?? d.book?.title ?? null,
    isbn10: d.isbn10 ?? d.book?.isbn10 ?? null,
    isbn13: d.isbn13 ?? d.book?.isbn13 ?? null,
    // 🔑 normalizamos el estado para que el frontend lo tenga siempre
    estado: readState(d),
  }))
}

// Agregados
export async function fetchLoanAggregates(params = {}) {
  const r = await api.get('/admin/loans/reports/aggregates', { params: clean(params) })
  const raw = r.data ?? {}
  return normalizeAgg(raw)
}

// Detalle
export async function fetchLoanById(id) {
  const r = await api.get(`/admin/loans/${id}`)
  const d = r.data ?? {}
  return {
    ...d,
    loan_id: d.loan_id ?? d.id ?? id,
    start_date: d.start_date ?? d.fecha_prestamo ?? d.created_at ?? null,
    due_date: d.due_date ?? d.fecha_compromiso ?? null,
    return_date: d.return_date ?? d.fecha_devolucion ?? null,
    book_title: d.book_title ?? d.book?.title ?? null,
    isbn10: d.isbn10 ?? d.book?.isbn10 ?? null,
    isbn13: d.isbn13 ?? d.book?.isbn13 ?? null,
    estado: readState(d),
  }
}

// Crear
export async function createLoan(payload) {
  const r = await api.post('/admin/loans', payload)
  const d = r.data ?? null
  if (!d) return null
  return { ...d, loan_id: d.loan_id ?? d.id }
}

// Renovar
export async function renewLoan(id) {
  const r = await api.post(`/admin/loans/${id}/renew`)
  return r.data ?? null
}

// Devolver
export async function returnLoan(id, body = {}) {
  const r = await api.post(`/admin/loans/${id}/return`, body)
  return r.data ?? null
}
