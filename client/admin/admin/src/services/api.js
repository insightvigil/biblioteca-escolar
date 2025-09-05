import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL
if (!baseURL) console.warn('[ADMIN] VITE_API_URL no definido en .env')

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

// ---- Helpers ----
const cleanParams = (obj = {}) => {
  const out = {}
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    out[k] = v
  })
  return out
}

// =======================
//        CATEGORÍAS
// =======================

// GET /categories (array plano)
export async function fetchCategories(params = {}) {
  const r = await api.get('/categories', { params: cleanParams(params) })
  return Array.isArray(r.data) ? r.data : []
}

// GET /categories/:id
export async function fetchCategory(id) {
  const r = await api.get(`/categories/${id}`)
  return r.data ?? null
}

// POST /admin/categories
export async function createCategory(payload) {
  const r = await api.post('/admin/categories', payload)
  return r.data ?? null
}

// PUT /admin/categories/:id
export async function updateCategory(id, payload) {
  const r = await api.put(`/admin/categories/${id}`, payload)
  return r.data ?? null
}

// DELETE /admin/categories/:id
export async function deleteCategory(id) {
  await api.delete(`/admin/categories/${id}`)
  return true
}

// GET /categories/:id/books (lista paginada por categoría)
export async function fetchBooksByCategory(id, params = {}) {
  const r = await api.get(`/categories/${id}/books`, { params: cleanParams(params) })
  // respuesta: { items, total, page, pageSize }
  const { items = [], total = 0, page = 1, pageSize = 20 } = r.data || {}
  return { items, total, page, pageSize }
}

// =======================
//          LIBROS
// =======================

// GET /books  (lista paginada/búsqueda)
export async function fetchBooks(params = {}) {
  const r = await api.get('/books', { params: cleanParams(params) })
  const { items = [], total = 0, page = 1, pageSize = 20 } = r.data || {}
  return { items, total, page, pageSize }
}

// Alias útil
export async function searchBooks({ q = '', page = 1, limit = 20, sort, order, available, category_id } = {}) {
  return fetchBooks({ q, page, limit, sort, order, available, category_id })
}

// GET /books/:id (detalle con todos los campos + category name)
export async function fetchBook(id) {
  const r = await api.get(`/books/${id}`)
  return r.data ?? null
}

// POST /admin/books (crear manual)
export async function createBook(payload) {
  // payload: { title (req), author?, year?, isbn13?, isbn10?, editorial?, volumen_tomo?, estante?, nivel?, paginas?, idioma?, sinopsis?, cover_url?, stock?, category_id? }
  const r = await api.post('/admin/books', payload)
  return r.data ?? null
}

// POST /admin/books/import-isbn (importar por ISBN + overrides)
export async function importBookByISBN(payload) {
  // payload mínimo: { isbn }
  // overrides opcionales: { category_id, stock, volumen_tomo, estante, nivel, paginas, idioma, sinopsis, cover_url, editorial }
  const r = await api.post('/admin/books/import-isbn', payload)
  return r.data ?? null
}

// PUT /admin/books/:id
export async function updateBook(id, payload) {
  const r = await api.put(`/admin/books/${id}`, payload)
  return r.data ?? null
}

// DELETE /admin/books/:id
export async function deleteBook(id) {
  await api.delete(`/admin/books/${id}`)
  return true
}
