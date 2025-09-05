export default function Button({ as: Tag = 'button', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center px-3 py-2 rounded-xl border text-sm'
  return <Tag className={base + (className ? ' ' + className : '')} {...props} />
}
