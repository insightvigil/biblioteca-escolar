// routes/loans/return.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Button from '../../components/ui/Button.jsx'
import { fetchLoanById, returnLoan } from '../../services/loans.js'

export default function LoanReturn(){
  const { id } = useParams()
  const nav = useNavigate()
  const [item, setItem] = useState(null)
  const [registrarPago, setRegistrarPago] = useState(false)
  const [estado, setEstado] = useState('bueno')
  const [notas, setNotas] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(()=>{
    let alive = true
    ;(async()=>{
      setStatus('loading')
      try {
        const found = await fetchLoanById(id)
        if (!alive) return
        setItem(found)
        setStatus('ready')
      } catch (e) {
        setError(e.message || 'Error'); setStatus('error')
      }
    })()
    return () => { alive = false }
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await returnLoan(id, { registrarPago, estado_devolucion: estado, notas_condicion: notas })
      nav(`/loans/${id}`)
    } catch (e) { setError(e.message || 'Error') }
  }

  if (status === 'loading') return <p>Cargando…</p>
  if (status === 'error') return <p>❌ {error}</p>
  if (!item) return null

  return (
    <div>
      <div className="hdr">
        <h2>Devolución</h2>
        <Link to={`/loans/${id}`}><Button>Volver</Button></Link>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-2 max-w-xl">
        <label className="frm-field">
          <span className="frm-label">Registrar pago si hay multa</span>
          <input type="checkbox" checked={registrarPago} onChange={(e)=>setRegistrarPago(e.target.checked)} />
        </label>

        <Select label="Estado a la devolución" value={estado} onChange={(e)=>setEstado(e.target.value)}>
          <option>bueno</option><option>regular</option><option>malo</option>
        </Select>

        <Input label="Notas" value={notas} onChange={(e)=>setNotas(e.target.value)} />

        {error && <p className="text-red-600">❌ {error}</p>}
        <Button type="submit">Confirmar devolución</Button>
      </form>
    </div>
  )
}
