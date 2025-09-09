// routes/categories/list.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Button from '../../components/ui/Button.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { fetchCategories, deleteCategory } from '../../services/api.js'

const parseIntSafe = (v, d) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : d
}

export default function CategoriesList() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    sort: searchParams.get('sort') || 'id',     // id | name
    order: searchParams.get('order') || 'desc', // asc | desc
    page: parseIntSafe(searchParams.get('page'), 1),
    limit: parseIntSafe(searchParams.get('limit'), 20),
  })

  // Carga desde API (el backend soporta q; sort/pag se hacen client-side)
  useEffect(() => {
    let alive = true
    ;(async () => {
      setStatus('loading')
      setError('')
      try {
        const data = await fetchCategories(filters.q ? { q: filters.q } : {})
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
  }, [filters.q])

  // Sincroniza URL
  useEffect(() => {
    const usp = new URLSearchParams()
    if (filters.q) usp.set('q', filters.q)
    usp.set('sort', filters.sort)
    usp.set('order', filters.order)
    usp.set('page', String(filters.page))
    usp.set('limit', String(filters.limit))
    setSearchParams(usp, { replace: true })
  }, [filters, setSearchParams])

  // Ordena + pagina en cliente
  const sortedItems = useMemo(() => {
    const arr = [...items]
    const { sort, order } = filters
    const sign = order === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      if (sort === 'name') {
        const an = (a.name || a.title || '').toString().toLocaleLowerCase()
        const bn = (b.name || b.title || '').toString().toLocaleLowerCase()
        if (an < bn) return -1 * sign
        if (an > bn) return  1 * sign
        return 0
      }
      const ai = Number(a.id) || 0
      const bi = Number(b.id) || 0
      return (ai - bi) * sign
    })
    return arr
  }, [items, filters.sort, filters.order])

  const pageItems = useMemo(() => {
    const start = (filters.page - 1) * filters.limit
    return sortedItems.slice(start, start + filters.limit)
  }, [sortedItems, filters.page, filters.limit])

  // Handlers (inputs controlados)
  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters((f) => ({ ...f, [name]: value }))
  }

  const handleApply = (e) => {
    e.preventDefault()
    // asegúrate de estar en la primera página al cambiar filtros
    setFilters((f) => ({ ...f, page: 1 }))
  }

  const handleClear = () => {
    setFilters((f) => ({ ...f, q: '', page: 1 }))
  }

  const onPageChange = (page) => setFilters((f) => ({ ...f, page }))

  const handleConfirmDelete = async (cat) => {
    setDeleting(true)
    try {
      await deleteCategory(cat.id)
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

      {/* Formulario único (búsqueda + sort + order + limit) */}
      <form
        onSubmit={handleApply}
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            name="q"
            placeholder="Buscar categoría"
            value={filters.q}
            onChange={handleChange}
            aria-label="Buscar categoría"
            style={{ width: 260 }}
          />
          <Button type="submit">Aplicar</Button>
          {filters.q && (
            <button type="button" onClick={handleClear}>Limpiar</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            name="sort"
            value={filters.sort}
            onChange={handleChange}
            aria-label="Ordenar por"
          >
            <option value="id">Recientes (ID)</option>
            <option value="name">Nombre</option>
          </select>
          <select
            name="order"
            value={filters.order}
            onChange={handleChange}
            aria-label="Dirección"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <select
            name="limit"
            value={String(filters.limit)}
            onChange={(e) =>
              setFilters((f) => ({ ...f, limit: parseIntSafe(e.target.value, f.limit), page: 1 }))
            }
            aria-label="Por página"
          >
            <option value="10">10 / pág</option>
            <option value="20">20 / pág</option>
            <option value="50">50 / pág</option>
            <option value="100">100 / pág</option>
          </select>
        </div>

        <Link to="/categories/new">+ Nueva categoría</Link>
      </form>

      {pageItems.length === 0 ? (
        <p>No hay categorías{filters.q ? ` para “${filters.q}”` : ''}.</p>
      ) : (
        <>
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
                {pageItems.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px' }}>{c.id}</td>
                    <td style={{ padding: '8px' }}>{c.name || c.title || `Categoría #${c.id}`}</td>
                    <td
                      style={{
                        padding: '8px',
                        maxWidth: 480,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={c.description || ''}
                    >
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

          <Pagination
            page={filters.page}
            pageSize={filters.limit}
            total={sortedItems.length}
            onPageChange={onPageChange}
          />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar categoría"
        message={`Esta acción no se puede deshacer. ¿Eliminar “${toDelete?.name || `Categoría #${toDelete?.id}`}”?`}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && handleConfirmDelete(toDelete)}
        confirmDisabled={deleting}
      />
    </div>
  )
}
