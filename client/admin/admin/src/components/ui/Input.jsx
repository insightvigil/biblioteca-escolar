export default function Input({ label, error, ...props }) {
  return (
    <label className="frm-field">
      {label && <span className="frm-label">{label}</span>}
      <input className="frm-input" {...props} />
      {error ? <small className="frm-error">{error}</small> : null}
    </label>
  )
}
