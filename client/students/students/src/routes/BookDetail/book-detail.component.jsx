import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { fetchBookById } from '../../services/api';


export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchBookById(id, { expand: 'category' });
        if (!mounted) return;
        setBook(data);
      } catch (e) { setError(e.message || 'Error al cargar libro'); }
      finally { setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <p className="state">Cargando…</p>;
  if (error) return <p className="state error">{error}</p>;
  if (!book) return <p className="state">No encontrado</p>;

  return (
    <article className="book-detail">
      <div className="media">
        {book.cover_url ? <img src={book.cover_url} alt={book.title} /> : <div className="placeholder">Sin portada</div>}
      </div>
      <div className="meta">
        <h1>{book.title}</h1>
        {book.author && <p className="muted">por {book.author}</p>}
        {book.category_name && <p className="chip">Categoría: {book.category_name}</p>}
        {book.editorial && <p>Editorial: {book.editorial}</p>}
        <p>Disponibilidad: {book.available ? 'Disponible' : 'Agotado'}</p>
        <p>Ubicación: Estante {book.estante ?? '-'} • Nivel {book.nivel ?? '-'}</p>
        <p>Páginas: {book.paginas ?? '-'}</p>
        <p>Idioma: {book.idioma ?? '-'}</p>
        {book.sinopsis && <div className="synopsis"><h3>Sinopsis</h3><p>{book.sinopsis}</p></div>}
        <div className="isbns">
          {book.isbn13 && <span>ISBN-13: {book.isbn13}</span>}
          {book.isbn10 && <span>ISBN-10: {book.isbn10}</span>}
        </div>
      </div>
    </article>
  );
}
