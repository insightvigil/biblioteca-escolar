// routes/loans/list.jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { fetchLoans, fetchLoanAggregates } from '../../services/loans.js'
import Pagination from '../../components/ui/Pagination.jsx'
import Button from '../../components/ui/Button.jsx'

// Hook para leer los query params de la URL
const useQuery = () => new URLSearchParams(useLocation().search)

// Formatea una fecha a 'dd de mes de yyyy'
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

// --- Helpers de normalización ---
/** Limpia filtros y mapea nombres al contrato de la API */
const cleanParams = (f) => {
  const q = Object.fromEntries(
    Object.entries(f).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  )
  // La API usa loan_state en lugar de estado
  if (q.estado) { q.loan_state = q.estado; delete q.estado }
  return q
}

/** Obtiene la clave de estado posible (por si algo llega distinto) */
const getRowState = (row) => row?.estado ?? row?.loan_state ?? row?.status ?? row?.state ?? null

/** Lee { estado, c } desde el agregado normalizado o hace fallback a items */
const countByState = (agg, items, state) => {
  const list = Array.isArray(agg?.byEstado) ? agg.byEstado : []
  const hit = list.find(x => (x?.estado ?? x?.loan_state ?? x?.status ?? x?.state) === state)
  if (hit && Number.isFinite(Number(hit.c))) return Number(hit.c)
  // fallback: contar en el cliente
  return items.reduce((acc, r) => acc + (getRowState(r) === state ? 1 : 0), 0)
}

export default function LoansList() {
  const nav = useNavigate()
  const q = useQuery()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 })
  const [agg, setAgg] = useState(null)
  const [filters, setFilters] = useState({
    num_control: q.get('num_control') || '',
    isbn: q.get('isbn') || '',
    estado: q.get('estado') || '',
    role: q.get('role') || '',
    from: q.get('from') || '',
    to: q.get('to') || '',
    page: Number(q.get('page') || 1),
    limit: Number(q.get('limit') || 20),
  })
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState('')

  // Sincroniza el objeto de filtros con la URL
  const syncURL = (f) => {
    const usp = new URLSearchParams()
    Object.entries(f).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) usp.set(k, v)
    })
    nav({ search: usp.toString() }, { replace: true })
  }

  // Efecto para cargar los datos cuando cambian los filtros
  useEffect(() => {
    let alive = true
    ;(async () => {
      setStatus('loading')
      setError('')
      try {
        const query = cleanParams(filters)

        const [data, summary] = await Promise.all([
          fetchLoans(query),
          fetchLoanAggregates({ from: query.from, to: query.to })
        ])

        if (!alive) return

        const fetchedItems = Array.isArray(data) ? data : []
        setItems(fetchedItems)
        setAgg(summary) // ya viene normalizado desde el service

        const page = query.page ?? filters.page
        const limit = query.limit ?? filters.limit

        const totalEstimado =
          fetchedItems.length < limit
            ? (page - 1) * limit + fetchedItems.length
            : page * limit + 1

        setMeta({ total: totalEstimado, page, pageSize: limit })
        setStatus('ready')
      } catch (e) {
        if (!alive) return
        setError(e.message || 'Error al cargar préstamos')
        setStatus('error')
      }
    })()

    // Mantén la URL sincronizada
    syncURL(filters)

    return () => { alive = false }
  }, [filters])

  const onPageChange = (page) => setFilters((f) => ({ ...f, page }))

  const applyFilters = (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const next = {
      ...filters,
      num_control: fd.get('num_control') || '',
      isbn: fd.get('isbn') || '',
      estado: fd.get('estado') || '',
      role: fd.get('role') || '',
      from: fd.get('from') || '',
      to: fd.get('to') || '',
      page: 1,
    }
    setFilters(next)
  }

  if (status === 'loading') return <p>Cargando…</p>
  if (status === 'error') return <p style={{ color: '#b91c1c' }}>❌ {error}</p>

  const activos  = countByState(agg, items, 'activo')
  const vencidos = countByState(agg, items, 'vencido')

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h2>Bitácora de préstamos</h2>
        <Link to="/loans/new">+ Nuevo préstamo</Link>
      </div>

      <form onSubmit={applyFilters} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <input name="num_control" placeholder="Nº control" defaultValue={filters.num_control} />
        <input name="isbn" placeholder="ISBN" defaultValue={filters.isbn} />
        <select name="estado" defaultValue={filters.estado}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="vencido">Vencido</option>
          <option value="devuelto">Devuelto</option>
          <option value="perdido">Perdido</option>
          <option value="dañado">Dañado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select name="role" defaultValue={filters.role}>
          <option value="">Todos los roles</option>
          <option value="alumno">Alumno</option>
          <option value="docente">Docente</option>
        </select>
        <input type="date" name="from" defaultValue={filters.from} style={{ width: 150 }}/>
        <input type="date" name="to" defaultValue={filters.to} style={{ width: 150 }}/>
        <Button type="submit">Aplicar</Button>
      </form>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ border: '1px solid #ddd', padding: '8px 16px', borderRadius: 8 }}>
          <strong>Total:</strong> {agg?.total ?? meta.total ?? items.length ?? 0}
        </div>
        <div style={{ border: '1px solid #ddd', padding: '8px 16px', borderRadius: 8 }}>
          <strong>Activos:</strong> {activos}
        </div>
        <div style={{ border: '1px solid #ddd', padding: '8px 16px', borderRadius: 8 }}>
          <strong>Vencidos:</strong> {vencidos}
        </div>
        <div style={{ border: '1px solid #ddd', padding: '8px 16px', borderRadius: 8 }}>
          <strong>Recaudado:</strong> ${Number(agg?.fines?.recaudado || 0).toFixed(2)}
        </div>
        <div style={{ border: '1px solid #ddd', padding: '8px 16px', borderRadius: 8 }}>
          <strong>Pendiente:</strong> ${Number(agg?.fines?.pendiente || 0).toFixed(2)}
        </div>
      </div>

      {items.length === 0 ? (
        <p>No hay préstamos que coincidan con los filtros.</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Fecha préstamo</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Fecha entrega</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Nº control</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Usuario</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Rol</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Nombre de libro</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>ISBN</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.loan_id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px' }}>{fmtDate(row.start_date)}</td>
                    <td style={{ padding: '8px' }}>{fmtDate(row.due_date)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {row.num_control || '—'}
                    </td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>
                      {row.nombre_completo}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{row.role}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{row.book_id}</td>
                    <td style={{ padding: '8px' }}>
                      {row.book_title || `Libro ID: ${row.book_id}`}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', minWidth: '150px' }}>
                      {`13: ${row.isbn13 || '—'}`}<br/>
                      {`10: ${row.isbn10 || '—'}`}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {getRowState(row) || '—'}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <Link to={`/loans/${row.loan_id}`}>Detalle</Link>
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
    </div>
  )
}
