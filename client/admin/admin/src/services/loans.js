import { API } from './api';

export async function listLoans(params = {}) {
  const { page=1, limit=20, ...rest } = params;
  const q = new URLSearchParams({ page, limit, ...rest }).toString();
  const { data } = await API.get(`/admin/loans?${q}`);
  return data;
}
export async function createLoan(payload) { const { data } = await API.post('/admin/loans', payload); return data; }
export async function renewLoan(id) { const { data } = await API.post(`/admin/loans/${id}/renew`); return data; }
export async function returnLoan(id, body={}) { const { data } = await API.post(`/admin/loans/${id}/return`, body); return data; }
export async function getLoanAggregates(params={}) { const q = new URLSearchParams(params).toString(); const { data } = await API.get(`/admin/loans/reports/aggregates?${q}`); return data; }
export async function getLoanById(id) { const { data } = await API.get(`/admin/loans/${id}`); return data; }
