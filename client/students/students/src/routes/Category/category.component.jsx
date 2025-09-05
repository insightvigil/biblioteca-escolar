import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { fetchCategoryById, fetchBooksByCategory } from '../../services/api';
import BookCard from '../../components/BookCard/book-card.component';


export default function Category() {
  const { id } = useParams();
  const [cat, setCat] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const [catRes, booksRes] = await Promise.all([
          fetchCategoryById(id),
          fetchBooksByCategory(id, { page, limit: pageSize })
        ]);
        if (!mounted) return;
        setCat(catRes);
        setItems(booksRes.items || []);
        setTotal(booksRes.total || 0);
        setPageSize(booksRes.pageSize || pageSize);
      } catch (e) { setError(e.message || 'Error al cargar categoría'); }
      finally { setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [id, page]);

  if (loading) return <p className="state">Cargando…</p>;
  if (error) return <p className="state error">{error}</p>;

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="category">
      <header className="head">
        <h1>{cat?.name ?? 'Categoría'}</h1>
        {cat?.description && <p className="muted">{cat.description}</p>}
      </header>
      <div className="grid">
        {items.map(b => <BookCard key={b.id} book={b} />)}
      </div>
      <div className="pager">
        <button disabled={page<=1} onClick={() => setPage(p=>p-1)}>Anterior</button>
        <span>{page} / {pages}</span>
        <button disabled={page>=pages} onClick={() => setPage(p=>p+1)}>Siguiente</button>
      </div>
    </div>
  );
}
