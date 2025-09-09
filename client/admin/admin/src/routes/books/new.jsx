// routes/books/new.jsx
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import Button from '../../components/ui/Button.jsx'
import BookForm from './BookForm.jsx'
import {
  fetchCategories,
  createBook,
  importBookByISBN,
  searchBooks,         // <- usamos esto para el fallback cuando el server responde 500
} from '../../services/api.js'

// === Helpers de limpieza/normalización ===
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

export default function NewBook() {
  const nav = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, formState:{ errors }, setValue, watch } = useForm({
    defaultValues: {
      title:'', author:'', year:'', isbn13:'', isbn10:'',
      editorial:'', volumen_tomo:'', estante:'', nivel:'',
      paginas:'', idioma:'', cover_url:'', sinopsis:'',
      category_id:'', stock: 0
    }
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const cats = await fetchCategories()
        if (!alive) return
        setCategories(Array.isArray(cats) ? cats : [])
      } finally {
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  // ====== Guardar con fallback 500 ======
  const onSubmit = async (values) => {
    setSaving(true)
    try {
      const payload = toPayload(values)
      const created = await createBook(payload)

      // Caso típico feliz (200/201 con body)
      if (created?.id) {
        nav('/books')
        return
      }

      // Si no devolvió id (raro), probamos existencia
      const probe = payload.isbn13 || payload.isbn10 || payload.title
      const { items = [] } = await searchBooks({ q: probe, limit: 1, sort: 'created_at', order: 'desc' })
      if (items[0]) {
        nav('/books')
        return
      }

      alert('Guardado, pero no fue posible confirmar el ID.')
      nav('/books')

    } catch (e) {
      // Fallback específico si el servidor ya insertó y falló al responder
      if (e?.status === 500) {
        try {
          const payload = toPayload(values)
          const probe = payload.isbn13 || payload.isbn10 || payload.title
          const { items = [] } = await searchBooks({ q: probe, limit: 1, sort: 'created_at', order: 'desc' })
          if (items[0]) {
            nav('/books')
            return
          }
        } catch {
          // ignoramos; caerá al alert de abajo
        }
      }
      alert(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // Importar por ISBN SOLO para prellenar (no guarda aún)
  const handleImportISBN = async () => {
    const isbn = prompt('Ingresa ISBN (10 o 13):')
    if (!isbn) return
    try {
      setSaving(true)
      const book = await importBookByISBN({ isbn: isbn.trim() })
      const fields = [
        'title','author','year','isbn13','isbn10','editorial','volumen_tomo',
        'estante','nivel','paginas','idioma','cover_url','sinopsis','category_id','stock'
      ]
      fields.forEach(k => {
        if (book?.[k] != null && book[k] !== '') setValue(k, book[k])
      })
      alert('Datos importados. Revisa y guarda.')
    } catch (e) {
      alert(e.message || 'Error al importar ISBN')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Cargando…</p>

  return (
    <div>
      <h2>Nuevo libro</h2>
      <BookForm
        categories={categories}
        register={register}
        handleSubmit={handleSubmit}
        errors={errors}
        watching={watch}
        onSubmit={onSubmit}
        onImportISBN={handleImportISBN}
        submitting={saving}
      />
      <div style={{marginTop:8}}>
        <Link to="/books">Cancelar</Link>
      </div>
    </div>
  )
}
