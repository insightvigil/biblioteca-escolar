export default function ConfirmDialog({ open, title='Confirmar', message='¿Seguro?', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <h3 style={{marginTop:0}}>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button onClick={onCancel}>Cancelar</button>
          <button onClick={onConfirm} style={{marginLeft:8}}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}
