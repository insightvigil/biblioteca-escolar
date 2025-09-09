export default function ConfirmDialog({
  open,
  title = 'Confirmar',
  message = '¿Seguro?',
  onConfirm,
  onCancel,
  confirmDisabled = false,
  cancelDisabled = false,
}) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button onClick={onCancel} disabled={cancelDisabled}>Cancelar</button>
          <button onClick={onConfirm} disabled={confirmDisabled} style={{ marginLeft: 8 }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
