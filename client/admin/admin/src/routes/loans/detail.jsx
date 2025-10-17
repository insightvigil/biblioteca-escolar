// routes/loans/detail.jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import Button from '../../components/ui/Button.jsx'
import { fetchLoanById, renewLoan } from '../../services/loans.js'

const shortId = (id) => (id ? String(id).slice(0, 8) : '—')
const show = (v, empty = 'NA') => (v === null || v === undefined || v === '' ? empty : v)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

export default function LoanDetail(){
  const { id } = useParams()
  const nav = useNavigate()
  const [item, setItem] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(()=>{
    let alive = true
    ;(async()=>{
      setStatus('loading'); setError('')
      try {
        const found = await fetchLoanById(id)
        if (!alive) return
        setItem(found)
        setStatus('ready')
      } catch (e) {
        setError(e.message || 'Error')
        setStatus('error')
      }
    })()
    return () => { alive = false }
  }, [id])

  if (status === 'loading') return <p>Cargando…</p>
  if (status === 'error') return <p>❌ {error}</p>
  if (!item) return null

  const titleRight = item.num_control ? ` — ${item.num_control}` : ''
  const title = `Préstamo #${shortId(item.loan_id)}${titleRight}`

  // Días de atraso (si no viene del servicio, lo calculamos)
  const computeDaysOverdue = () => {
    const due = item.due_date ? new Date(item.due_date) : null
    if (!due) return null
    const ref = item.returned ? (item.return_date ? new Date(item.return_date) : new Date()) : new Date()
    const diff = ref.getTime() - due.getTime()
    if (diff <= 0) return 0
    return Math.floor(diff / 86400000)
  }
  const daysOverdue = typeof item.days_overdue === 'number' ? item.days_overdue : computeDaysOverdue()

  return (
    <div>
      <div className="hdr">
        <h2>{title}</h2>
        <div className="gap-2 flex">
          <Button
            onClick={async()=>{ await renewLoan(item.loan_id); nav(0); }}
            disabled={item.returned === true}
          >
            Renovar
          </Button>
          <Link to={`/loans/${item.loan_id}/return`}>
            <Button disabled={item.returned === true}>Devolver</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-2">
        {/* Usuario */}
        <div><b>Nombre completo:</b> {show(item.nombre_completo, '—')}</div>
        <div><b>Número de control:</b> {show(item.num_control, '—')}</div>
        <div><b>Correo electrónico:</b> {show(item.correo, '—')}</div>
        <div><b>Carrera:</b> {show(item.carrera, '—')}</div>

        {/* Fechas */}
        <div><b>Fecha de Préstamo:</b> {fmtDate(item.start_date)}</div>
        <div><b>Fecha de Entrega:</b> {fmtDate(item.due_date)}</div>
        {item.returned ? (
          <div><b>Fecha de Finalización:</b> {fmtDate(item.return_date)}</div>
        ) : null}

        {/* Estado / multa */}
        <div><b>Estado:</b> {item.estado || '—'}</div>
        <div><b>Multa:</b> ${Number(item.multa_calculada ?? item.fine ?? 0).toFixed(2)}</div>

        {/* Libro */}
        <div><b>Nombre de libro:</b> {show(item.book_title, `#${show(item.book_id, '—')}`)}</div>
        <div><b>ISBN-10:</b> {show(item.isbn10)}</div>
        <div><b>ISBN-13:</b> {show(item.isbn13)}</div>

        {/* Atraso */}
        <div><b>Días de atraso:</b> {daysOverdue && daysOverdue > 0 ? daysOverdue : 'NA'}</div>
      </div>

      <div className="mt-3">
        <Link to="/loans">Volver</Link>
      </div>
    </div>
  )
}
