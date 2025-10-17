// routes/loans/detail.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import Button from '../../components/ui/Button.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import { fetchLoanById, renewLoan } from '../../services/loans.js'

const shortId = (id) => (id ? String(id).slice(0, 8) : '—')
const show = (v, empty = '—') => (v === null || v === undefined || v === '' ? empty : v)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
const fmtMoney = (n) => {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0
  return v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
}

export default function LoanDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [item, setItem] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [confirmRenew, setConfirmRenew] = useState(false)
  const [working, setWorking] = useState(false)

  // Fetch
  useEffect(() => {
    let alive = true
    ;(async () => {
      setStatus('loading'); setError(''); setItem(null)
      try {
        const found = await fetchLoanById(id)
        if (!alive) return
        setItem(found)
        setStatus('ready')
      } catch (e) {
        setError(e?.message || 'Error al cargar el préstamo')
        setStatus('error')
      }
    })()
    return () => { alive = false }
  }, [id])

  // Normalizadores defensivos (por si el backend manda claves alternativas)
  const loan = useMemo(() => {
    if (!item) return null
    const status = item.status || item.loan_state || (item.returned ? 'devuelto' : 'activo')
    const fine = item.multa_calculada ?? item.fine ?? item.fine_cents ?? 0
    const bookTitle = item.book_title || item.book?.title
    const isbn10 = item.isbn10 || item.book?.isbn10
    const isbn13 = item.isbn13 || item.book?.isbn13
    const start = item.start_date || item.created_at
    const due = item.due_date
    const returnedAt = item.return_date
    return { ...item, status, fine, bookTitle, isbn10, isbn13, start, due, returnedAt }
  }, [item])

  // Días de atraso (server > client; si no viene, se calcula)
  const daysOverdue = useMemo(() => {
    if (!loan) return null
    if (typeof loan.days_overdue === 'number') return loan.days_overdue
    const due = loan.due ? new Date(loan.due) : null
    if (!due) return null
    // ref: si está devuelto, usar return_date; si no, hoy
    const ref = loan.status === 'devuelto' && loan.returnedAt ? new Date(loan.returnedAt) : new Date()
    const diff = ref.getTime() - due.getTime()
    if (diff <= 0) return 0
    return Math.floor(diff / 86400000)
  }, [loan])

  const canRenew = useMemo(() => {
    if (!loan) return false
    // Política mínima: solo préstamos activos pueden renovar.
    return loan.status === 'activo'
  }, [loan])

  const canReturn = useMemo(() => {
    if (!loan) return false
    // No devolver si ya está devuelto/cancelado
    return loan.status !== 'devuelto' && loan.status !== 'cancelado'
  }, [loan])

  const titleRight = loan?.num_control ? ` — ${loan.num_control}` : ''
  const title = `Préstamo #${shortId(loan?.loan_id)}${titleRight}`

  // Handlers
  const handleRenew = async () => {
    setConfirmRenew(false)
    setWorking(true)
    try {
      await renewLoan(loan.loan_id)
      // Recargar para ver due_date y renewals_count actualizados
      nav(0)
    } catch (e) {
      setWorking(false)
      setError(e?.response?.data?.message || e?.message || 'No se pudo renovar el préstamo')
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <div className="grid gap-2">
        <Skeleton height={28} />
        <Skeleton height={140} />
        <Skeleton height={24} />
      </div>
    )
  }

  if (status === 'error') {
    return <ErrorState title="No se pudo cargar el detalle" description={error} />
  }

  if (!loan) return null

  // Badges de estado y atraso
  const StatusBadge = () => {
    const s = loan.status
    const cls =
      s === 'activo' ? 'badge badge--info'
      : s === 'vencido' ? 'badge badge--warn'
      : s === 'devuelto' ? 'badge badge--success'
      : 'badge'
    return <span className={cls} title="Estado del préstamo">{s}</span>
  }

  const OverdueBadge = () => {
    if (daysOverdue === null || daysOverdue <= 0) return null
    return <span className="badge badge--danger" title="Días de atraso">{daysOverdue} d de atraso</span>
  }

  return (
    <div className="loan-detail">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2">
          {title} <StatusBadge /> <OverdueBadge />
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setConfirmRenew(true)}
            disabled={!canRenew || working}
            title={canRenew ? 'Renovar préstamo' : 'Solo préstamos activos pueden renovarse'}
          >
            Renovar
          </Button>
          <Link to={`/loans/${loan.loan_id}/return`}>
            <Button disabled={!canReturn || working} variant="secondary" title={canReturn ? 'Registrar devolución' : 'Este préstamo ya está cerrado'}>
              Devolver
            </Button>
          </Link>
        </div>
      </div>

      {/* Card principal */}
      <div className="card p-3 grid gap-3">
        {/* Resumen superior */}
        <div className="grid" style={{ gridTemplateColumns: '1fr auto', gap: '1rem' }}>
          <div className="text-sm">
            <div><b>Préstamo:</b> {fmtDate(loan.start)}</div>
            <div><b>Entrega programada:</b> {fmtDate(loan.due)}</div>
            {loan.status === 'devuelto' && (
              <div><b>Devuelto:</b> {fmtDate(loan.returnedAt)}</div>
            )}
          </div>
          <div className="text-right text-sm">
            <div><b>Renovaciones:</b> {show(loan.renewals_count, 0)}</div>
            <div><b>Multa acumulada:</b> {fmtMoney(loan.fine)}</div>
          </div>
        </div>

        {/* Secciones en dos columnas */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {/* Usuario */}
          <section className="card p-2">
            <h3 className="mb-2">Usuario</h3>
            <div className="grid gap-1 text-sm">
              <div><b>Rol:</b> {show(loan.role)}</div>
              <div><b>Nombre:</b> {show(loan.nombre_completo)}</div>
              <div><b>Núm. control:</b> {show(loan.num_control)}</div>
              <div><b>Correo:</b> {show(loan.correo)}</div>
              {loan.role === 'alumno' && <div><b>Carrera:</b> {show(loan.carrera)}</div>}
            </div>
          </section>

          {/* Libro */}
          <section className="card p-2">
            <h3 className="mb-2">Libro</h3>
            <div className="grid gap-1 text-sm">
              <div><b>Título:</b> {show(loan.bookTitle)}</div>
              <div><b>ID libro:</b> {show(loan.book_id)}</div>
              <div><b>ISBN-10:</b> {show(loan.isbn10)}</div>
              <div><b>ISBN-13:</b> {show(loan.isbn13)}</div>
            </div>
          </section>
        </div>

        {/* Control / Notas */}
        <section className="card p-2">
          <h3 className="mb-2">Control</h3>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="text-sm"><b>Estado de salida:</b> {show(loan.estado_salida)}</div>
            <div className="text-sm"><b>Estado de regreso:</b> {show(loan.estado_regreso)}</div>
            <div className="text-sm"><b>Estación:</b> {show(loan.station)}</div>
          </div>
          <div className="mt-2 text-sm">
            <b>Notas:</b>
            <div className="mt-1">{show(loan.notas)}</div>
          </div>
        </section>
      </div>

      <div className="mt-3">
        <Link to="/loans" className="link">&larr; Volver al listado</Link>
      </div>

      {/* Confirmación de renovación */}
      <ConfirmDialog
        open={confirmRenew}
        title="Confirmar renovación"
        description="¿Deseas renovar este préstamo? Se recalculará la fecha de entrega según la política vigente."
        confirmLabel="Sí, renovar"
        cancelLabel="Cancelar"
        onConfirm={handleRenew}
        onCancel={() => setConfirmRenew(false)}
      />
    </div>
  )
}
