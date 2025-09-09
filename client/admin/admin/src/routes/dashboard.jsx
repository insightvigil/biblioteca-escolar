import { useEffect, useState } from 'react'
import { searchBooks } from '../services/api.js'

export default function Dashboard() {
  const [status, setStatus] = useState('idle')
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setStatus('loading')
      try {
        const { items } = await searchBooks({ limit: 1 })
        if (!alive) return
        setCount(Array.isArray(items) ? items.length : 0)
        setStatus('success')
      } catch (e) {
        setError(e?.message || 'Error')
        setStatus('error')
      }
    })()
    return () => { alive = false }
  }, [])

  if (status === 'loading') return <p>Cargando…</p>
  if (status === 'error') return <p>❌ Error conectando con API: {error}</p>

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Conexión OK. Ejemplo: fetched <b>{count}</b> libro(s).</p>
    </div>
  )
}
