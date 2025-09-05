import { useEffect, useMemo, useState } from 'react';
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
  const [available, setAvailable] = useState(undefined); // true | false | undefined
  const [sort, setSort] = useState('title');             // 'title'|'created_at'|'author'
  const [order, setOrder] = useState('asc');             // 'asc'|'desc'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // Cargar meta de la categoría
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const c = await fetchCategoryById(id);
        if (!alive) return;
        setCat(c);
      } catch {
        if (!alive) return;
        setError('No se pudo cargar la categoría.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // Cargar libros (paginado + filtros)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchBooksByCategory(id, { page, limit: pageSize, available, sort, order });
        if (!alive) return;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch {
        if (!alive) return;
        setError('No se pudo cargar la lista de libros.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, page, pageSize, available, sort, order]);

  if (loading && !items.length) return <p className="state">Cargando…</p>;
  if (error) return <p className="state error">{error}</p>;

  return (
    <div className="category-page">
      <header className="head">
        <h1>{cat?.name ?? 'Categoría'}</h1>
        {cat?.description && <p className="muted">{cat.description}</p>}
        <div className="filters">
          <label>
            Disponibilidad:
            <select value={String(available)} onChange={(e) => {
              const v = e.target.value;
              setPage(1);
              setAvailable(v === 'true' ? true : v === 'false' ? false : undefined);
            }}>
              <option value="undefined">Todas</option>
              <option value="true">Solo disponibles</option>
              <option value="false">No disponibles</option>
            </select>
          </label>
          <label>
            Ordenar por:
            <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="title">Título</option>
              <option value="author">Autor</option>
              <option value="created_at">Recientes</option>
            </select>
          </label>
          <label>
            Orden:
            <select value={order} onChange={(e) => { setPage(1); setOrder(e.target.value); }}>
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </label>
          <label>
            Por página:
            <select value={pageSize} onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={32}>32</option>
            </select>
          </label>
        </div>
      </header>

      <div className="grid">
        {items.map(b => <BookCard key={b.id} book={b} />)}
        {items.length === 0 && <p className="muted">Sin resultados.</p>}
      </div>

      <div className="pager">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
        <span>{page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
      </div>
    </div>
  );
}
