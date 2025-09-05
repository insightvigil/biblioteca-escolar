import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>404</h1>
      <p>Página no encontrada.</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  );
}
