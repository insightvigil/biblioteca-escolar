// src/services/settings.js
import axios from 'axios'
import { api } from './api.js'

// Deriva el root del API quitando /api/v1 del baseURL actual
const apiBase = api.defaults.baseURL || ''
const rootBase = apiBase.replace(/\/api\/v1\/?$/, '')

export const apiRoot = axios.create({
  baseURL: rootBase || window.location.origin,
  timeout: 12000,
})

// Reutiliza el mismo manejo de errores del admin (opcional)
apiRoot.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status
    const msg = err?.response?.data?.message || err.message || 'Error de red'
    console.error('[SETTINGS API ERROR]:', status, msg)
    return Promise.reject(Object.assign(new Error(msg), { status }))
  }
)

export async function getSettings() {
  const r = await apiRoot.get('/settings')
  return r.data
}

export async function updateDbHost(host) {
  const r = await apiRoot.put('/settings/db-host', { host })
  return r.data
}
