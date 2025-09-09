import { useNavigate, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import { createCategory } from '../../services/api.js'

export default function NewCategory() {
  const nav = useNavigate()
  const { register, handleSubmit, formState: { isSubmitting } } = useForm()

  const onSubmit = async (values) => {
    await createCategory({
      name: values.name?.trim(),
      description: values.description?.trim() || null,
    })
    nav('/categories')
  }

  return (
    <div>
      <h2>Nueva categoría</h2>
      <form className="frm" onSubmit={handleSubmit(onSubmit)}>
        <Input label="Nombre" required {...register('name', { required: true })} />

        <div className="frm-row">
          <label className="frm-label" htmlFor="description">Descripción (opcional)</label>
          <textarea
            id="description"
            rows={4}
            placeholder="Breve descripción de la categoría"
            {...register('description')}
          />
        </div>

        <div className="frm-actions">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
          <Link to="/categories" style={{ marginLeft: 8 }}>Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
