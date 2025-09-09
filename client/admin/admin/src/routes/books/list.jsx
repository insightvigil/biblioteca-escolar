import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { fetchBooks, fetchCategories, deleteBook } from '../../services/api.js'
import Pagination from '../../components/ui/Pagination.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState(null)

  const syncURL = (f) => {
    const usp = new URLSearchParams()
    Object.entries(f).forEach(([k,v]) => {
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
      } catch (e) { /* ignore */ }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setError('')
      try {
        const { items, total, page, pageSize } = await fetchBooks(filters)
        if (!alive) return
        setItems(items)
        setMeta({ total, page, pageSize })
      } catch (e) {
        setError(e.message || 'Error al cargar libros')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    syncURL(filters)
    return () => { alive = false }
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

  const confirmDelete = async (id) => {
    try {
      await deleteBook(id)
      setToDelete(null)
      // refresh
      setFilters((f) => ({ ...f }))
    } catch (e) {
      alert(e.message || 'No se pudo eliminar')
    }
  }

  return (
    <div>
      <h2>Libros</h2>

      <form onSubmit={applyFilters} style={{display:'grid', gap:8, marginBottom:12}}>
        <div style={{display:'grid', gap:8, gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr 1fr'}}>
          <input name="q" placeholder="Buscar por título/autor" defaultValue={filters.q} />
          <select name="category_id" defaultValue={filters.category_id}>
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <button type="submit">Aplicar</button>
        </div>
      </form>

      <div style={{marginBottom:12}}>
        <Link to="/books/new">+ Nuevo libro</Link>
      </div>

      {loading ? <p>Cargando…</p> : error ? <p style={{color:'#b91c1c'}}>❌ {error}</p> : (
        items.length === 0 ? <p>No hay libros.</p> : (
          <ul>
            {items.map(b => (
              <li key={b.id} style={{display:'flex', alignItems:'center', gap:8}}>
                <strong>{b.title}</strong>{b.author ? ` — ${b.author}` : ''}
                {b.available === true ? <span style={{marginLeft:8}}>✅</span> : <span style={{marginLeft:8}}>⛔</span>}
                <span style={{marginLeft:'auto'}} />
                <Link to={`/books/${b.id}/edit`}>Editar</Link>
                <button onClick={()=>setToDelete(b.id)}>Eliminar</button>
              </li>
            ))}
          </ul>
        )
      )}

      <Pagination
        page={meta.page}
        pageSize={meta.pageSize}
        total={meta.total}
        onPageChange={onPageChange}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar libro"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        onCancel={()=>setToDelete(null)}
        onConfirm={()=>confirmDelete(toDelete)}
      />
    </div>
  )
}
