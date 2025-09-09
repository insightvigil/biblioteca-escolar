import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Button from '../../components/ui/Button.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import { fetchBook, updateBook, deleteBook, fetchCategories } from '../../services/api.js'

export default function EditBook() {
  const { id } = useParams()
  const nav = useNavigate()
  const [categories, setCategories] = useState([])
  const [openConfirm, setOpenConfirm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [book, cats] = await Promise.all([fetchBook(id), fetchCategories()])
        if (!alive) return
        setCategories(cats)
        reset({
          title: book?.title || '',
          author: book?.author || '',
          year: book?.year || '',
          isbn13: book?.isbn13 || '',
          isbn10: book?.isbn10 || '',
          editorial: book?.editorial || '',
          volumen_tomo: book?.volumen_tomo || '',
          estante: book?.estante || '',
          nivel: book?.nivel || '',
          paginas: book?.paginas || '',
          idioma: book?.idioma || '',
          sinopsis: book?.sinopsis || '',
          cover_url: book?.cover_url || '',
          category_id: book?.category_id || '',
          stock: typeof book?.stock === 'number' ? book.stock : '',
        })
      } catch (e) {
        setError(e.message || 'Error al cargar libro')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id, reset])

  const onSubmit = async (values) => {
    setSaving(true); setError('')
    try {
      const payload = {
        title: values.title?.trim(),
        author: values.author || undefined,
        year: values.year ? Number(values.year) : undefined,
        isbn13: values.isbn13 || undefined,
        isbn10: values.isbn10 || undefined,
        editorial: values.editorial || undefined,
        volumen_tomo: values.volumen_tomo || undefined,
        estante: values.estante || undefined,
        nivel: values.nivel || undefined,
        paginas: values.paginas ? Number(values.paginas) : undefined,
        idioma: values.idioma || undefined,
        sinopsis: values.sinopsis || undefined,
        cover_url: values.cover_url || undefined,
        category_id: values.category_id ? Number(values.category_id) : undefined,
        stock: values.stock ? Number(values.stock) : undefined,
      }
      await updateBook(id, payload)
      alert('Cambios guardados')
      nav('/books')
    } catch (e) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    try {
      await deleteBook(id)
      alert('Libro eliminado')
      nav('/books')
    } catch (e) {
      alert(e.message || 'No se pudo eliminar')
    }
  }

  if (loading) return <p>Cargando…</p>
  if (error) return <p style={{color:'#b91c1c'}}>❌ {error}</p>

  return (
    <div>
      <h2>Editar Libro</h2>
      <form className="frm" onSubmit={handleSubmit(onSubmit)}>
        <div className="frm-grid">
          <Input label="Título" required {...register('title', { required: true })} />
          <Input label="Autor" {...register('author')} />
          <Input label="Año" type="number" {...register('year')} />
          <Input label="ISBN-13" {...register('isbn13')} />
          <Input label="ISBN-10" {...register('isbn10')} />
          <Input label="Editorial" {...register('editorial')} />
          <Input label="Volumen/Tomo" {...register('volumen_tomo')} />
          <Input label="Estante" {...register('estante')} />
          <Input label="Nivel" {...register('nivel')} />
          <Input label="Páginas" type="number" min="1" {...register('paginas')} />
          <Input label="Idioma" {...register('idioma')} />
          <Input label="Portada URL" {...register('cover_url')} />
          <Select label="Categoría" {...register('category_id')}>
            <option value="">(sin categoría)</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Stock" type="number" min="0" {...register('stock')} />
        </div>
        <Input label="Sinopsis" {...register('sinopsis')} />
        <div className="frm-actions">
          <Button type="submit" disabled={saving}>{saving?'Guardando…':'Guardar'}</Button>
          <button type="button" onClick={()=>setOpenConfirm(true)} style={{marginLeft:8}}>Eliminar</button>
          <Link to="/books" style={{marginLeft:8}}>Cancelar</Link>
        </div>
      </form>

      <ConfirmDialog
        open={openConfirm}
        title="Eliminar libro"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        onCancel={()=>setOpenConfirm(false)}
        onConfirm={onDelete}
      />
    </div>
  )
}
