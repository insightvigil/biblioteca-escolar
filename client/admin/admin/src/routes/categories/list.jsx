import { useEffect, useState } from 'react'
import { fetchCategories } from '../../services/api.js'

export default function CategoriesList() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setStatus('loading')
      try {
        const data = await fetchCategories()
        if (!alive) return
        setItems(Array.isArray(data) ? data : [])
        setStatus('success')
      } catch (e) {
        setError(e?.message || 'Error')
        setStatus('error')
      }
    })()
    return () => { alive = false }
  }, [])

  if (status === 'loading') return <p>Cargando categorías…</p>
  if (status === 'error') return <p>❌ {error}</p>

  return (
    <div>
      <h2>Categorías</h2>
      {items.length === 0 ? (
        <p>No hay categorías aún.</p>
      ) : (
        <ul>
          {items.map(c => (
            <li key={c.id}>
              <strong>{c.name || c.title || `Categoría #${c.id}`}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
