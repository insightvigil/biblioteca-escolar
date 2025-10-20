// routes/loans/LoanForm.jsx
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';

export default function LoanForm({
  register,
  handleSubmit,
  errors,
  watching,
  onSubmit,
  submitting = false,
}) {
  const selectedRole = watching('role');

  return (
    <form className="frm" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* --- Sección de Préstamo --- */}
      <div className="frm-grid" style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        <Select
          label="Rol del usuario"
          required
          {...register('role', { required: 'El rol es obligatorio' })}
          error={errors?.role?.message}
        >
          <option value="alumno">Alumno</option>
          <option value="docente">Docente</option>
        </Select>

        <Input
          label="ISBN del libro (10 o 13)"
          required
          placeholder="978-3-16-148410-0"
          {...register('isbn', {
            required: 'El ISBN es obligatorio',
            pattern: {
              value: /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/,
              message: 'ISBN debe ser de 10 o 13 dígitos',
            },
          })}
          error={errors?.isbn?.message}
        />
      </div>

      {/* --- Sección de Usuario (Condicional) --- */}
      <h4>Datos del usuario</h4>
      {selectedRole === 'alumno' ? (
        <div className="frm-grid" style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <Input
            label="Nº de control"
            required
            {...register('num_control', { required: 'El Nº de control es obligatorio' })}
            error={errors?.num_control?.message}
          />
          <Input
            label="Nombre completo"
            required
            {...register('nombre_completo_alumno', { required: 'El nombre es obligatorio' })}
            error={errors?.nombre_completo_alumno?.message}
          />
          <Select
            label="Sexo"
            required
           {...register('sexo_alumno', { required: 'El sexo es obligatorio' })}
           error={errors?.sexo_alumno?.message}
         >
            <option value="">Seleccionar…</option>
            <option value="H">Hombre</option>
            <option value="M">Mujer</option>
          </Select>
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label="Carrera"
              required
              {...register('carrera', { required: 'La carrera es obligatoria' })}
              error={errors?.carrera?.message}
            />
          </div>
        </div>
      ) : (
        <div className="frm-grid" style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <Input
            label="Nombre completo"
            required
            {...register('nombre_completo_docente', { required: 'El nombre es obligatorio' })}
            error={errors?.nombre_completo_docente?.message}
          />
          <Input
            label="Correo electrónico"
            type="email"
            required
            {...register('correo', {
              required: 'El correo es obligatorio',
              pattern: { value: /^\S+@\S+$/i, message: 'Correo inválido' },
            })}
            error={errors?.correo?.message}
          />
          <Select
            label="Sexo"
            {...register('sexo_docente')}
          >
           <option value="">Sin especificar</option>
           <option value="H">Hombre</option>
           <option value="M">Mujer</option>
         </Select>
        </div>
      )}

      {/* --- Sección de Condición del Libro --- */}
      <h4>Condición del libro (opcional)</h4>
      <div className="frm-grid" style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        <Select label="Estado de salida" {...register('estado_salida')}>
          <option value="">Seleccionar estado...</option>
          <option value="bueno">Bueno</option>
          <option value="regular">Regular</option>
          <option value="malo">Malo</option>
        </Select>
        <Input
          label="Notas de condición"
          placeholder="Ej: Ligero desgaste en portada"
          {...register('notas')}
        />
      </div>

      <div className="frm-actions" style={{ marginTop: 20 }}>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Crear préstamo'}
        </Button>
      </div>
    </form>
  );
}