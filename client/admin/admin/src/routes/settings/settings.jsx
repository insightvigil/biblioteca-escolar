// src/routes/settings.jsx
import { useEffect, useState } from 'react'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import { getSettings, updateDbHost } from '../../services/settings.js'

const isValidHost = (s = '') => {
  const v = s.trim()
  if (!v) return false
  const ipv4 = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/
  const ipv6 = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i
  const host = /^[a-zA-Z0-9.-]+$/
  return ipv4.test(v) || ipv6.test(v) || host.test(v)
}

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [host, setHost] = useState('')
  const [info, setInfo] = useState(null)
  const [showRestart, setShowRestart] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await getSettings()
        if (!mounted) return
        setInfo(data ?? null)
        const current = data?.info?.host ?? ''
        setHost(current)
      } catch (e) {
        setError(e.message || 'Error cargando settings')
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    setShowRestart(false)

    const v = host.trim()
    if (!isValidHost(v)) {
      setError('Host inválido. Usa IP (IPv4/IPv6) o hostname sin espacios.')
      return
    }

    try {
      setSaving(true)
      const res = await updateDbHost(v)
      setOk(res?.message || 'Actualizado correctamente.')
      setInfo((prev) => ({
        ...(prev || {}),
        databaseUrlMasked: res?.databaseUrlMasked ?? prev?.databaseUrlMasked,
        info: res?.info ?? prev?.info,
      }))
      // Mostrar mensaje y botón de reinicio
      setShowRestart(true)
    } catch (e) {
      setError(e.message || 'Error actualizando host de la base de datos')
    } finally {
      setSaving(false)
    }
  }

  const onRestart = async () => {
    try {
      setOk('Reiniciando servidor...')
      await fetch('/settings/restart', { method: 'POST' })
      setOk('El servidor se está reiniciando. Puede tardar unos segundos.')
      setShowRestart(false)
    } catch (e) {
      setError('No se pudo reiniciar el servidor.')
    }
  }

  if (loading) return <p>Cargando…</p>

  return (
    <div className="card">
      <h1 className="title">Ajustes — Conexión a Base de Datos</h1>
      <p className="muted">
        Aquí puedes actualizar el <code>host</code> (IP o nombre) de la variable <code>DATABASE_URL</code> en el <code>.env</code> del servidor.
      </p>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Estado actual</h3>
        {info?.databaseUrlMasked ? (
          <pre style={{ background:'#f8fafc', padding:12, borderRadius:10, overflow:'auto' }}>
{info.databaseUrlMasked}
          </pre>
        ) : (
          <p className="muted">No se encontró <code>DATABASE_URL</code> en el <code>.env</code>.</p>
        )}
      </div>

      <form onSubmit={onSubmit} className="frm" style={{ marginTop: 16 }}>
        <div className="frm-grid" style={{ display:'grid', gap:12, gridTemplateColumns:'2fr auto' }}>
          <Input
            label="Host/IP de PostgreSQL"
            placeholder="Ej. 192.168.0.159 o postgres.local"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
          />
          <div style={{ display:'flex', alignItems:'flex-end' }}>
            <Button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>

        {error && <div className="alert error" style={{ marginTop:8 }}>{error}</div>}
        {ok && <div className="alert success" style={{ marginTop:8 }}>{ok}</div>}

        {showRestart && (
          <div className="alert warning" style={{ marginTop:12 }}>
            ⚠️ El servidor debe reiniciarse para funcionar correctamente.<br/>
            <Button onClick={onRestart} className="btn-secondary" style={{ marginTop:8 }}>
              Reiniciar servidor ahora
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
