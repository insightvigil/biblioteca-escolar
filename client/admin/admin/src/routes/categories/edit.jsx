import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import { fetchCategory, updateCategory, deleteCategory } from '../../services/api.js'

export default function EditCategory() {
  const { id } = useParams()
  const nav = useNavigate()
  const { register, handleSubmit, reset, formState:{ isSubmitting } } = useForm()
  const [openConfirm, setOpenConfirm] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const cat = await fetchCategory(id)
      if (!alive) return
      reset({
        name: cat?.name ?? '',
        description: cat?.description ?? '',
      })
    })()
    return () => { alive = false }
  }, [id, reset])

  const onSubmit = async (values) => {
    await updateCategory(id, {
      name: values.name?.trim(),
      description: values.description?.trim() || null,
    })
    nav('/categories')
  }

  const onConfirmDelete = async () => {
    await deleteCategory(id)
    nav('/categories')
  }

  return (
    <div>
      <h2>Editar categoría</h2>
      <form className="frm" onSubmit={handleSubmit(onSubmit)}>
        <Input label="Nombre" required {...register('name', { required: true })} />

        <div className="frm-row">
          <label className="frm-label" htmlFor="description">Descripción (opcional)</label>
          <textarea
            id="description"
            rows={4}
            placeholder="Breve descripción de la categoría"
            {...register('description')}
            className="frm-textarea"
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div className="frm-actions">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
          <button type="button" onClick={() => setOpenConfirm(true)} style={{ marginLeft: 8 }}>
            Eliminar
          </button>
          <Link to="/categories" style={{ marginLeft: 8 }}>Cancelar</Link>
        </div>
      </form>

      <ConfirmDialog
        open={openConfirm}
        title="Eliminar categoría"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        onCancel={() => setOpenConfirm(false)}
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}
