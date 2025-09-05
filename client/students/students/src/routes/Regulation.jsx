import { useEffect, useState } from 'react';
import { fetchRegulation } from '../services/api';

export default function Regulation() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchRegulation();
        if (!mounted) return;
        setText(res.content || '');
      } catch (e) { setError(e.message || 'Error al cargar reglamento'); }
      finally { setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <p className="state">Cargando…</p>;
  if (error) return <p className="state error">{error}</p>;

  return (
    <div className="regulation">
      <h1>Reglamento de la Biblioteca</h1>
      <pre className="mono">{text}</pre>
    </div>
  );
}
