import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { fetchBooks, fetchCategories, deleteBook } from '../../services/api.js'
import Pagination from '../../components/ui/Pagination.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Button from '../../components/ui/Button.jsx'

const useQuery = () => new URLSearchParams(useLocation().search)

export default function BooksList() {
  const nav = useNavigate()
  const q = useQuery()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 })
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({
    q: q.get('q') || '',
    category_id: q.get('category_id') || '',
    available: q.get('available') || '',
    sort: q.get('sort') || 'created_at',
    order: q.get('order') || 'desc',
    page: Number(q.get('page') || 1),
    limit: Number(q.get('limit') || 20),
  })
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const syncURL = (f) => {
    const usp = new URLSearchParams()
    Object.entries(f).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) usp.set(k, v)
    })
    nav({ search: usp.toString() }, { replace: true })
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const cats = await fetchCategories()
        if (!alive) return
        setCategories(cats)
      } catch (e) {
        /* ignore */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setStatus('loading')
      setError('')
      try {
        const { items, total, page, pageSize } = await fetchBooks(filters)
        if (!alive) return
        setItems(items)
        setMeta({ total, page, pageSize })
        setStatus('ready')
      } catch (e) {
        if (!alive) return
        setError(e.message || 'Error al cargar libros')
        setStatus('error')
      }
    })()
    syncURL(filters)
    return () => {
      alive = false
    }
  }, [filters])

  const onPageChange = (page) => setFilters((f) => ({ ...f, page }))

  const applyFilters = (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const next = {
      ...filters,
      q: fd.get('q') || '',
      category_id: fd.get('category_id') || '',
      available: fd.get('available') || '',
      sort: fd.get('sort') || 'created_at',
      order: fd.get('order') || 'desc',
      page: 1, // reset al cambiar filtros
    }
    setFilters(next)
  }

  const handleConfirmDelete = async (book) => {
    setDeleting(true)
    try {
      await deleteBook(book.id)
      setToDelete(null)
      setItems((prev) => prev.filter((x) => x.id !== book.id))
    } catch (e) {
      alert(e.message || 'No se pudo eliminar el libro')
    } finally {
      setDeleting(false)
    }
  }

  if (status === 'loading') return <p>Cargando…</p>
  if (status === 'error') return <p style={{ color: '#b91c1c' }}>❌ {error}</p>

  return (
    <div>
      <h2>Libros</h2>

      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <form onSubmit={applyFilters} style={{ display: 'flex', gap: 8 }}>
          <input
            name="q"
            placeholder="Buscar por título/autor"
            defaultValue={filters.q}
            style={{ width: 250 }}
          />
          <select name="category_id" defaultValue={filters.category_id}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="available" defaultValue={filters.available}>
            <option value="">Todos</option>
            <option value="true">Disponibles</option>
            <option value="false">No disponibles</option>
          </select>
          <select name="sort" defaultValue={filters.sort}>
            <option value="created_at">Recientes</option>
            <option value="title">Título</option>
            <option value="author">Autor</option>
          </select>
          <select name="order" defaultValue={filters.order}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <Button type="submit">Aplicar</Button>
        </form>
        <Link to="/books/new">+ Nuevo libro</Link>
      </div>

      {items.length === 0 ? (
        <p>No hay libros.</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Título</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Autor</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Categoría</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Disponible</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{b.title}</td>
                    <td style={{ padding: '8px' }}>{b.author || '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {b.category ? b.category.name : '—'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {b.available ? '✅' : '⛔'}
                    </td>
                    <td style={{ padding: '8px', display: 'flex', gap: 8 }}>
                      <Link to={`/books/${b.id}/edit`}>Editar</Link>
                      <button type="button" onClick={() => setToDelete(b)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
            onPageChange={onPageChange}
          />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar libro"
        message={
          `Esta acción no se puede deshacer. ¿Deseas eliminar “${toDelete?.title}` +
          `” de ${toDelete?.author || '—'}?`
        }
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && handleConfirmDelete(toDelete)}
        confirmDisabled={deleting}
      />
    </div>
  )
}