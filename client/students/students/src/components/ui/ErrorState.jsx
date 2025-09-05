export default function ErrorState({ children = 'Ocurrió un error.', action }) {
  return (
    <div className="error-state" role="alert">
      <p>{children}</p>
      {action}
    </div>
  );
}
