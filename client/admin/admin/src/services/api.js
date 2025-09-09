import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'
 if (!import.meta.env.VITE_API_URL) console.warn('[ADMIN] VITE_API_URL no definido, usando', baseURL)

export const api = axios.create({ baseURL, timeout: 12000 })

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status
    const msg = err?.response?.data?.message || err.message || 'Error de red'
    console.error('[API ERROR]:', status, msg)
    return Promise.reject(Object.assign(new Error(msg), { status }))
  }
)

const cleanParams = (obj = {}) => {
  const out = {}
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    out[k] = v
  })
  return out
}

// Categorías
export async function fetchCategories(params = {}) {
  const r = await api.get('/categories', { params: cleanParams(params) })
  return Array.isArray(r.data) ? r.data : []
}

export async function fetchCategory(id) {
  const r = await api.get(`/categories/${id}`)
  return r.data ?? null
}

export async function createCategory(payload) {
  const r = await api.post('/admin/categories', payload)
  return r.data ?? null
}

export async function updateCategory(id, payload) {
  const r = await api.put(`/admin/categories/${id}`, payload)
  return r.data ?? null
}

export async function deleteCategory(id) {
  await api.delete(`/admin/categories/${id}`)
  return true
}

export async function fetchBooksByCategory(id, params = {}) {
  const r = await api.get(`/categories/${id}/books`, { params: cleanParams(params) })
  const { items = [], total = 0, page = 1, pageSize = 20 } = r.data || {}
  return { items, total, page, pageSize }
}

// Libros
export async function fetchBooks(params = {}) {
  const r = await api.get('/books', { params: cleanParams(params) })
  const { items = [], total = 0, page = 1, pageSize = 20 } = r.data || {}
  return { items, total, page, pageSize }
}

export async function searchBooks({ q = '', page = 1, limit = 20, sort, order, available, category_id } = {}) {
  return fetchBooks({ q, page, limit, sort, order, available, category_id })
}

export async function fetchBook(id) {
  try {
    const r = await api.get(`/books/${id}`);
    return r.data ?? null;
  } catch (e) {
    if (e?.status === 404) return null; // usa e.status del interceptor
    throw e;
  }}

export async function createBook(payload) {
  const r = await api.post('/admin/books', payload)
  return r.data ?? null
}

export async function importBookByISBN(payload) {
  const r = await api.post('/admin/books/import-isbn', payload)
  return r.data ?? null
}

export async function updateBook(id, payload) {
  const r = await api.put(`/admin/books/${id}`, payload)
  return r.data ?? null
}

export async function deleteBook(id) {
  await api.delete(`/admin/books/${id}`)
  return true
}
