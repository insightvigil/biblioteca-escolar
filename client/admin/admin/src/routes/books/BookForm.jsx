// components/books/BookForm.jsx
import { useEffect, useMemo, useState } from 'react'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Button from '../../components/ui/Button.jsx'

export default function BookForm({
  defaultValues = {},
  categories = [],
  onSubmit,
  onImportISBN,          // opcional (solo en "nuevo")
  onDelete,              // opcional (solo en "editar")
  register,
  handleSubmit,
  errors,
  watching,              // optional: pass watch() to live update
  submitting = false,
}) {
  const watch = watching || (() => undefined)
  const [sinopsisCount, setSinopsisCount] = useState(
    (defaultValues?.sinopsis || '').length
  )

  const coverUrl = watch('cover_url') || defaultValues?.cover_url || ''

  const currentYear = new Date().getFullYear()
  const yearMin = 1900
  const yearMax = currentYear + 1

  useEffect(() => {
    setSinopsisCount((watch('sinopsis') || '').length)
  }, [watch('sinopsis')]) // eslint-disable-line

  return (
    <form className="frm" onSubmit={handleSubmit(onSubmit)}>
      <div className="frm-grid" style={{display:'grid', gap:12, gridTemplateColumns:'1fr 1fr'}}>
        <Input label="Título" required
          {...register('title', { required: 'Requerido', minLength:{value:2, message:'Mín 2'} })}
          error={errors?.title?.message}
        />
        <Input label="Autor"
          {...register('author', { maxLength:{value:160, message:'Máx 160'} })}
          error={errors?.author?.message}
        />
        <Input label="Año" type="number"
          {...register('year', {
            valueAsNumber: true,
            validate: v => (v==null || (v>=yearMin && v<=yearMax)) || `Entre ${yearMin} y ${yearMax}`,
          })}
          error={errors?.year?.message}
        />
        <Input label="Editorial" {...register('editorial')} />

        <Input label="ISBN-13" {...register('isbn13')} />
        <Input label="ISBN-10" {...register('isbn10')} />

        <Input label="Volumen/Tomo" {...register('volumen_tomo', { maxLength:{value:80, message:'Máx 80'} })} />
        <Input label="Estante" {...register('estante', { maxLength:{value:80, message:'Máx 80'} })} />
        <Input label="Nivel" {...register('nivel', { maxLength:{value:80, message:'Máx 80'} })} />

        <Input label="Páginas" type="number" min="1"
          {...register('paginas', { valueAsNumber: true, min:{value:1, message:'Mín 1'} })}
          error={errors?.paginas?.message}
        />
        <Input label="Idioma" {...register('idioma', { maxLength:{value:40, message:'Máx 40'} })} />

        <Input label="Portada URL" placeholder="https://covers.openlibrary.org/..."
          {...register('cover_url')}
        />

        <div className="frm-row" style={{gridColumn:'1 / -1'}}>
          <label className="frm-label" htmlFor="sinopsis">Sinopsis</label>
          <textarea
            id="sinopsis" rows={5}
            placeholder="Breve sinopsis…"
            {...register('sinopsis', { maxLength:{value:1200, message:'Máx 1200'} })}
            className="frm-textarea"
            style={{ width:'100%', padding:'8px' }}
          />
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <small className="muted">{errors?.sinopsis?.message || 'Opcional'}</small>
            <small>{sinopsisCount}/1200</small>
          </div>
        </div>

        <div style={{display:'grid', gap:8}}>
          <Select label="Categoría" {...register('category_id')}>
            <option value="">Sin categoría</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Input label="Stock" type="number" min="0"
            {...register('stock', { valueAsNumber: true, min:{value:0, message:'No negativo'} })}
            error={errors?.stock?.message}
          />
        </div>

        {/* Vista previa de portada */}
        <div style={{display:'flex', alignItems:'flex-start', gap:12}}>
          <div style={{width:120, height:160, border:'1px solid #e5e7eb', display:'grid', placeItems:'center', overflow:'hidden'}}>
            {coverUrl ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img src={coverUrl} alt="Portada" style={{maxWidth:'100%', maxHeight:'100%'}} />
            ) : (
              <span className="muted" style={{fontSize:12}}>Sin portada</span>
            )}
          </div>
        </div>
      </div>

      <div className="frm-actions" style={{marginTop:12}}>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>

        {onImportISBN && (
          <button type="button" onClick={onImportISBN} style={{marginLeft:8}}>
            Importar por ISBN
          </button>
        )}

        {onDelete && (
          <button type="button" onClick={onDelete} style={{marginLeft:8}}>
            Eliminar
          </button>
        )}
      </div>
    </form>
  )
}
