import { useNavigate, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import { createCategory } from '../../services/api.js'

export default function CategoryNew() {
  const nav = useNavigate()
  const { register, handleSubmit, formState: { isSubmitting } } = useForm()

  const onSubmit = async (data) => {
    try {
      await createCategory({
        name: data.name?.trim(),
        description: data.description?.trim() || null,
      })
      nav('/categories')
    } catch (err) {
      alert(err.message || 'No se pudo crear la categoría')
    }
  }

  return (
    <div>
      <h2>Nueva categoría</h2>

      <form className="frm grid gap-2" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Nombre"
          placeholder="Ej. Literatura"
          required
          {...register('name', { required: true })}
        />

        <div className="frm-row">
          <label className="frm-label" htmlFor="description">
            Descripción (opcional)
          </label><br/>
          <textarea
            id="description"
            rows="5"
            cols="150"
            placeholder="Breve descripción de la categoría"
            {...register('description')}
          />
        </div>

        <div className="frm-actions flex gap-2 mt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
          <Link to="/categories">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
