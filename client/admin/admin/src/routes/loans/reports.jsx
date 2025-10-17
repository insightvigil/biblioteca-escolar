// routes/loans/reports.jsx
import { useEffect, useState } from 'react'
import Input from '../../components/ui/Input.jsx'
import { fetchLoanAggregates } from '../../services/loans.js'

export default function LoanReports(){
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(()=>{
    let alive = true
    ;(async()=>{
      setStatus('loading'); setError('')
      try {
        const a = await fetchLoanAggregates({ from, to })
        if (!alive) return
        setData(a)
        setStatus('ready')
      } catch (e) { setError(e.message || 'Error'); setStatus('error') }
    })()
    return () => { alive = false }
  }, [from, to])

  return (
    <div>
      <div className="hdr">
        <h2>Reportes de préstamos</h2>
      </div>
      <div className="flex gap-2 mb-4">
        <Input label="Desde" type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
        <Input label="Hasta" type="date" value={to} onChange={(e)=>setTo(e.target.value)} />
      </div>
      {status==='loading' && <p>Cargando…</p>}
      {status==='error' && <p>❌ {error}</p>}
      {status==='ready' && <pre className="bg-muted p-3 rounded" style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  )
}
