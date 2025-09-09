import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Button from '../../components/ui/Button.jsx'
import { importBookByISBN, createBook, fetchCategories } from '../../services/api.js'

export default function NewBook() {
  const nav = useNavigate()
  const [mode, setMode] = useState('isbn') // 'isbn' | 'manual'
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      isbn: '',
      category_id: '',
      stock: 1,
      // overrides opcionales
      editorial: '', volumen_tomo: '', estante: '', nivel: '',
      paginas: '', idioma: '', sinopsis: '', cover_url: '',
      // manual
      title: '', author: '', year: '', isbn13: '', isbn10: '',
    }
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const cats = await fetchCategories()
        if (!alive) return
        setCategories(cats)
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { alive = false }
  }, [])

  const onImport = async (values) => {
    setError(''); setLoading(true)
    try {
      const payload = {
        isbn: values.isbn?.trim(),
        category_id: values.category_id ? Number(values.category_id) : undefined,
        stock: values.stock ? Number(values.stock) : undefined,
        editorial: values.editorial || undefined,
        volumen_tomo: values.volumen_tomo || undefined,
        estante: values.estante || undefined,
        nivel: values.nivel || undefined,
        paginas: values.paginas ? Number(values.paginas) : undefined,
        idioma: values.idioma || undefined,
        sinopsis: values.sinopsis || undefined,
        cover_url: values.cover_url || undefined,
      }
      const book = await importBookByISBN(payload)
      if (book?.id) {
        alert('Libro importado correctamente')
        nav(`/books/${book.id}/edit`)
      } else {
        alert('Importación realizada, pero no se recibió ID. Regresando al listado.')
        nav('/books')
      }
    } catch (e) {
      setError(e.message || 'Error al importar ISBN')
    } finally {
      setLoading(false)
    }
  }

  const onCreateManual = async (values) => {
    setError(''); setLoading(true)
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
      const book = await createBook(payload)
      if (book?.id) {
        alert('Libro creado')
        nav(`/books/${book.id}/edit`)
      } else {
        alert('Creado sin ID devuelto; regresando a listado.')
        nav('/books')
      }
    } catch (e) {
      setError(e.message || 'Error al crear libro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Nuevo Libro</h2>
      <div style={{display:'flex', gap:8, marginBottom:12}}>
        <button disabled={mode==='isbn'} onClick={()=>setMode('isbn')}>Importar por ISBN</button>
        <button disabled={mode==='manual'} onClick={()=>setMode('manual')}>Registro manual</button>
      </div>

      {error && <p style={{color:'#b91c1c'}}>❌ {error}</p>}

      {mode === 'isbn' ? (
        <form className="frm" onSubmit={handleSubmit(onImport)}>
          <div className="frm-grid">
            <Input label="ISBN (10 o 13)" required {...register('isbn', { required: true })} />
            <Select label="Categoría (opcional)" {...register('category_id')}>
              <option value="">(sin categoría)</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Stock (opcional)" type="number" min="0" {...register('stock')} />
            <Input label="Editorial (override)" {...register('editorial')} />
            <Input label="Volumen/Tomo (override)" {...register('volumen_tomo')} />
            <Input label="Estante (override)" {...register('estante')} />
            <Input label="Nivel (override)" {...register('nivel')} />
            <Input label="Páginas (override)" type="number" min="1" {...register('paginas')} />
            <Input label="Idioma (override)" {...register('idioma')} />
            <Input label="Portada URL (override)" {...register('cover_url')} />
          </div>
          <Input label="Sinopsis (override)" {...register('sinopsis')} />
          <div className="frm-actions">
            <Button type="submit" disabled={loading}>{loading?'Importando…':'Importar y guardar'}</Button>
            <Link to="/books">Cancelar</Link>
          </div>
        </form>
      ) : (
        <form className="frm" onSubmit={handleSubmit(onCreateManual)}>
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
            <Button type="submit" disabled={loading}>{loading?'Guardando…':'Guardar'}</Button>
            <Link to="/books">Cancelar</Link>
          </div>
        </form>
      )}
    </div>
  )
}
