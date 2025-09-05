import { useEffect, useState } from 'react'
import { fetchBooks } from '../../services/api.js'

export default function BooksList() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setStatus('loading')
      try {
        const { items, total, page, pageSize } = await fetchBooks({ page: 1, limit: 20 })
        if (!alive) return
        setItems(items)
        setMeta({ total, page, pageSize })
        setStatus('success')
      } catch (e) {
        setError(e?.message || 'Error')
        setStatus('error')
      }
    })()
    return () => { alive = false }
  }, [])

  if (status === 'loading') return <p>Cargando libros…</p>
  if (status === 'error') return <p>❌ {error}</p>

  return (
    <div>
      <h2>Libros</h2>
      <p>Total: {meta.total}</p>
      {items.length === 0 ? (
        <p>No hay libros aún.</p>
      ) : (
        <ul>
          {items.map(b => (
            <li key={b.id}>
              <strong>{b.title}</strong> {b.author ? `— ${b.author}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
