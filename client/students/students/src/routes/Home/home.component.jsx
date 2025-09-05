import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { fetchHome } from '../../services/api';
import BookCard from '../../components/BookCard/book-card.component';

export default function Home() {
  const [cats, setCats] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchHome({ catLimit: 10, bookLimit: 16 });
        if (!mounted) return;
        setCats(data.featuredCategories ?? []);
        setBooks(data.latestBooks ?? []);
      } catch (e) {
        if (!mounted) return;
        setError('No se pudo cargar el inicio.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <p className="state">Cargando…</p>;
  if (error) return <p className="state error">{error}</p>;

  return (
    <div className="home">
      <section className="cats">
        <h2>Categorías destacadas</h2>
        <div className="chips">
          {cats.map(c => (
            <Link key={c.id} className="chip" to={`/categoria/${c.id}`}>{c.name}</Link>
          ))}
          {cats.length === 0 && <p className="muted">Aún no hay categorías.</p>}
        </div>
      </section>

      <section className="books-grid">
        <h2>Libros recientes</h2>
        <div className="grid">
          {books.map(b => <BookCard key={b.id} book={b} />)}
          {books.length === 0 && <p className="muted">Aún no hay libros.</p>}
        </div>
      </section>
    </div>
  );
}
