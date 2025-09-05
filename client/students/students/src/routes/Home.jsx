import { useEffect, useState } from 'react';
import { fetchHome } from '../services/api';
import BookCard from '../components/BookCard/book-card.component';


export default function Home() {
  const [cats, setCats] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchHome({ catLimit: 10, bookLimit: 16 });
        if (!mounted) return;
        setCats(data.featuredCategories ?? []);
        setBooks(data.latestBooks ?? []);
      } catch (e) { setError(e.message || 'Error al cargar Home'); }
      finally { setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <p className="state">Cargando…</p>;
  if (error) return <p className="state error">{error}</p>;

  return (
    <div className="home">
      <section className="cats-carousel">
        <h2>Categorías</h2>
        <div className="chips">
          {cats.map(c => (
            <a key={c.id} className="chip" href={`/categoria/${c.id}`}>{c.name}</a>
          ))}
        </div>
      </section>

      <section className="books-grid">
        <h2>Libros recientes</h2>
        <div className="grid">
          {books.map(b => <BookCard key={b.id} book={b} />)}
        </div>
      </section>
    </div>
  );
}
