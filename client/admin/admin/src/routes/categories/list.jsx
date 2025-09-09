// routes/categories/list.jsx
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Button from '../../components/ui/Button.jsx'
import { fetchCategories, deleteCategory } from '../../services/api.js'

export default function CategoriesList() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState(null) // category object
  const [deleting, setDeleting] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') || '')

  // Cargar categorías (con búsqueda opcional)
  useEffect(() => {
    let alive = true
    ;(async () => {
      setStatus('loading')
      try {
        const data = await fetchCategories(q ? { q } : {})
        if (!alive) return
        setItems(Array.isArray(data) ? data : [])
        setStatus('ready')
      } catch (e) {
        if (!alive) return
        setError(e.message || 'Error al cargar categorías')
        setStatus('error')
      }
    })()
    return () => { alive = false }
  }, [q])

  // Aplicar búsqueda
  const onSearch = (e) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const value = (form.get('q') || '').toString().trim()
    setSearchParams(value ? { q: value } : {})
    setQ(value)
  }

  // Eliminar categoría (confirmado)
  const handleConfirmDelete = async (cat) => {
    setDeleting(true)
    try {
      await deleteCategory(cat.id)
      // Optimista: quitar de la lista
      setItems(prev => prev.filter(x => x.id !== cat.id))
      setToDelete(null)
    } catch (e) {
      alert(e.message || 'No se pudo eliminar la categoría')
    } finally {
      setDeleting(false)
    }
  }

  if (status === 'loading') return <p>Cargando…</p>
  if (status === 'error') return <p style={{ color: '#b91c1c' }}>❌ {error}</p>

  return (
    <div>
      <h2>Categorías</h2>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <form onSubmit={onSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            name="q"
            placeholder="Buscar categoría"
            defaultValue={q}
            aria-label="Buscar categoría"
          />
          <Button type="submit">Buscar</Button>
          {q && (
            <button type="button" onClick={() => { setQ(''); setSearchParams({}) }}>
              Limpiar
            </button>
          )}
        </form>

        <Link to="/categories/new">+ Nueva categoría</Link>
      </div>

      {items.length === 0 ? (
        <p>No hay categorías{q ? ` para “${q}”` : ''}.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Nombre</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Descripción</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px' }}>{c.id}</td>
                  <td style={{ padding: '8px' }}>{c.name || c.title || `Categoría #${c.id}`}</td>
                  <td style={{
                    padding: '8px',
                    maxWidth: 480,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {c.description || '—'}
                  </td>
                  <td style={{ padding: '8px', display: 'flex', gap: 8 }}>
                    <Link to={`/categories/${c.id}/edit`}>Editar</Link>
                    <button type="button" onClick={() => setToDelete(c)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar categoría"
        message={`Esta acción no se puede deshacer. ¿Eliminar “${toDelete?.name || `Categoría #${toDelete?.id}`}` + `”?`}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && handleConfirmDelete(toDelete)}
        confirmDisabled={deleting}
      />
    </div>
  )
}
