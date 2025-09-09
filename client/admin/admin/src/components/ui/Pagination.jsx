export default function Pagination({ page=1, pageSize=20, total=0, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const prev = () => onPageChange && onPageChange(Math.max(1, page - 1))
  const next = () => onPageChange && onPageChange(Math.min(totalPages, page + 1))

  return (
    <div className="pager">
      <button disabled={page<=1} onClick={prev}>Anterior</button>
      <span style={{margin: '0 8px'}}>Página {page} de {totalPages}</span>
      <button disabled={page>=totalPages} onClick={next}>Siguiente</button>
    </div>
  )
}
