// routes/books/edit.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import BookForm from './BookForm.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import { fetchBook, fetchCategories, updateBook, deleteBook } from '../../services/api.js'

// Helpers de limpieza/normalización (mismos que en new.jsx)
function toNumber(v) {
  if (v === 0 || v === '0') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}
function toStringOrUndef(v) {
  const t = (v ?? '').toString().trim()
  return t.length ? t : undefined
}
function toPayload(values) {
  return {
    title: toStringOrUndef(values.title),                 // requerido
    author: toStringOrUndef(values.author),
    year: toNumber(values.year),
    isbn13: toStringOrUndef(values.isbn13),
    isbn10: toStringOrUndef(values.isbn10),
    editorial: toStringOrUndef(values.editorial),
    volumen_tomo: toStringOrUndef(values.volumen_tomo),
    estante: toStringOrUndef(values.estante),
    nivel: toStringOrUndef(values.nivel),
    paginas: toNumber(values.paginas),
    idioma: toStringOrUndef(values.idioma),
    cover_url: toStringOrUndef(values.cover_url),
    sinopsis: toStringOrUndef(values.sinopsis),
    category_id: values.category_id ? toNumber(values.category_id) : undefined,
    stock: toNumber(values.stock),
  }
}

export default function EditBook() {
  const { id } = useParams()
  const nav = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openConfirm, setOpenConfirm] = useState(false)

  const { register, handleSubmit, formState:{ errors }, reset, watch } = useForm()

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [book, cats] = await Promise.all([fetchBook(id), fetchCategories()])
        if (!alive) return
        setCategories(Array.isArray(cats) ? cats : [])
        reset({
          title: book?.title ?? '',
          author: book?.author ?? '',
          year: book?.year ?? '',
          isbn13: book?.isbn13 ?? '',
          isbn10: book?.isbn10 ?? '',
          editorial: book?.editorial ?? '',
          volumen_tomo: book?.volumen_tomo ?? '',
          estante: book?.estante ?? '',
          nivel: book?.nivel ?? '',
          paginas: book?.paginas ?? '',
          idioma: book?.idioma ?? '',
          cover_url: book?.cover_url ?? '',
          sinopsis: book?.sinopsis ?? '',
          category_id: book?.category_id ?? '',
          stock: book?.stock ?? 0,
        })
      } finally {
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id, reset])

  const onSubmit = async (values) => {
    setSaving(true)
    try {
      const payload = toPayload(values)
      await updateBook(id, payload)
      nav('/books')
    } catch (e) {
      alert(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = () => setOpenConfirm(true)
  const confirmDelete = async () => {
    try {
      await deleteBook(id)
      nav('/books')
    } catch (e) {
      alert(e.message || 'No se pudo eliminar')
    }
  }

  if (loading) return <p>Cargando…</p>

  return (
    <div>
      <h2>Editar libro</h2>
      <BookForm
        categories={categories}
        register={register}
        handleSubmit={handleSubmit}
        errors={errors}
        watching={watch}
        onSubmit={onSubmit}
        onDelete={onDelete}
        submitting={saving}
      />
      <div style={{marginTop:8}}>
        <Link to="/books">Cancelar</Link>
      </div>

      <ConfirmDialog
        open={openConfirm}
        title="Eliminar libro"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        onCancel={()=>setOpenConfirm(false)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
