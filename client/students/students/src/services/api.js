import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://192.168.1.108:4000/api/v1';
const api = axios.create({ baseURL, timeout: 10000 });

// Home
export async function fetchHome({ catLimit = 10, bookLimit = 16 } = {}) {
  const r = await api.get('/home', { params: { catLimit, bookLimit } });
  return r.data;
}

// Regulation
export async function fetchRegulation() {
  const r = await api.get('/regulation');
  return r.data;
}

// Categories
export async function fetchCategories(params = {}) {
  const r = await api.get('/categories', { params });
  return r.data;
}
export async function fetchCategoryById(id) {
  const r = await api.get(`/categories/${id}`);
  return r.data;
}
export async function fetchBooksByCategory(id, { page = 1, limit = 20, q, available, sort, order } = {}) {
  const r = await api.get(`/categories/${id}/books`, {
    params: { page, limit, q, available, sort, order }
  });
  return r.data; // {items,total,page,pageSize}
}

// Books
export async function fetchBooks({ page = 1, limit = 20, q, available, sort, order, category_id } = {}) {
  const r = await api.get('/books', { params: { page, limit, q, available, sort, order, category_id } });
  return r.data; // {items,total,page,pageSize}
}
export async function fetchBookById(id, { expand } = {}) {
  const r = await api.get(`/books/${id}`, { params: { expand } });
  return r.data;
}

// Suggest
export async function fetchSuggest(q, limit = 8) {
  const r = await api.get('/search/suggest', { params: { q, limit } });
  return r.data;
}

export default api;
