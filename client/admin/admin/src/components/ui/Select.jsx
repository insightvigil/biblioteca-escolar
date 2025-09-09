export default function Select({ label, error, children, ...props }) {
  return (
    <label className="frm-field">
      {label && <span className="frm-label">{label}</span>}
      <select className="frm-input" {...props}>
        {children}
      </select>
      {error ? <small className="frm-error">{error}</small> : null}
    </label>
  )
}
