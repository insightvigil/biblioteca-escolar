// routes/loans/new.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import { createLoan } from '../../services/loans.js'

export default function NewLoan() {
  const nav = useNavigate()
  const [role, setRole] = useState('alumno')
  const [isbn, setIsbn] = useState('')
  const [alumno, setAlumno] = useState({ num_control: '', nombre_completo: '', carrera: '' })
  const [docente, setDocente] = useState({ nombre_completo: '', correo: '' })
  const [estadoSalida, setEstadoSalida] = useState('')
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      // --- CORRECCIÓN DE FUNCIONALIDAD AQUÍ ---
      // La API espera un payload plano, no un objeto "book" anidado.
      const payload = {
        role,
        isbn, // El ISBN se envía en el nivel superior para que el backend identifique el libro
        estado_salida: estadoSalida || undefined, // Datos específicos de la condición en este préstamo
        notas_condicion: notas || undefined,
        alumno: role === 'alumno' ? alumno : undefined,
        docente: role === 'docente' ? docente : undefined,
      }

      const created = await createLoan(payload)
      nav(`/loans/${created.loan_id}`) // Navegar a la página de detalle del préstamo creado
    } catch (e) {
      setError(e.message || 'Error al crear el préstamo')
    } finally {
      setSubmitting(false)
    }
  }
  
  // Estilo común para los contenedores de campos de formulario
  const fieldGroupStyle = { marginBottom: 16 }
  const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Nuevo préstamo</h2>
        <Link to="/loans">Cancelar</Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={fieldGroupStyle}>
          <h4>Datos del préstamo</h4>
          <div style={gridStyle}>
            <div>
              <label htmlFor="role">Rol del usuario</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)} required>
                <option value="alumno">Alumno</option>
                <option value="docente">Docente</option>
              </select>
            </div>
            <div>
              <label htmlFor="isbn">ISBN del libro (10 o 13)</label>
              <input id="isbn" type="text" placeholder="978-3-16-148410-0" value={isbn} onChange={(e) => setIsbn(e.target.value)} required />
            </div>
          </div>
        </div>

        <div style={fieldGroupStyle}>
          <h4>Datos del usuario</h4>
          {role === 'alumno' ? (
            <div style={gridStyle}>
              <div>
                <label htmlFor="num_control">Nº de control</label>
                <input id="num_control" value={alumno.num_control} onChange={(e) => setAlumno({ ...alumno, num_control: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="nombre_completo_alumno">Nombre completo</label>
                <input id="nombre_completo_alumno" value={alumno.nombre_completo} onChange={(e) => setAlumno({ ...alumno, nombre_completo: e.target.value })} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label htmlFor="carrera">Carrera</label>
                <input id="carrera" value={alumno.carrera} onChange={(e) => setAlumno({ ...alumno, carrera: e.target.value })} required />
              </div>
            </div>
          ) : (
            <div style={gridStyle}>
              <div>
                <label htmlFor="nombre_completo_docente">Nombre completo</label>
                <input id="nombre_completo_docente" value={docente.nombre_completo} onChange={(e) => setDocente({ ...docente, nombre_completo: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="correo_docente">Correo electrónico</label>
                <input id="correo_docente" type="email" value={docente.correo} onChange={(e) => setDocente({ ...docente, correo: e.target.value })} required />
              </div>
            </div>
          )}
        </div>

        <div style={fieldGroupStyle}>
          <h4>Condición del libro (opcional)</h4>
          <div style={gridStyle}>
            <div>
              <label htmlFor="estado_salida">Estado de salida</label>
              <select id="estado_salida" value={estadoSalida} onChange={(e) => setEstadoSalida(e.target.value)}>
                <option value="">Seleccionar estado...</option>
                <option value="bueno">Bueno</option>
                <option value="regular">Regular</option>
                <option value="malo">Malo</option>
              </select>
            </div>
            <div>
              <label htmlFor="notas">Notas de condición</label>
              <input id="notas" type="text" placeholder="Ej: Ligero desgaste en portada" value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
          </div>
        </div>
        
        {error && <p style={{ color: '#b91c1c', marginBottom: 12 }}>❌ {error}</p>}

        <div style={{ marginTop: 20 }}>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Crear préstamo'}
          </Button>
        </div>
      </form>
    </div>
  )
}