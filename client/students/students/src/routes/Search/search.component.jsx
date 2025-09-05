import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { fetchBooks } from '../../services/api';
import BookCard from '../../components/BookCard/book-card.component';

export default function SearchResults() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const page = Number(sp.get('page') ?? 1);
  const limit = Number(sp.get('limit') ?? 20);
  const sort = sp.get('sort') ?? 'title';
  const order = sp.get('order') ?? 'asc';
  const availableParam = sp.get('available');
  const available = availableParam === 'true' ? true : availableParam === 'false' ? false : undefined;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = await fetchBooks({ q, page, limit, available, sort, order });
        if (!alive) return;
        setItems(data.items ?? data ?? []); // soporta ambos formatos
        setTotal(data.total ?? 0);
      } catch {
        if (!alive) return; setError('No se pudo cargar la búsqueda.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [q, page, limit, available, sort, order]);

  const setParams = (obj) => {
    const next = new URLSearchParams(sp);
    Object.entries(obj).forEach(([k,v]) => {
      if (v === undefined || v === null || v === '') next.delete(k);
      else next.set(k, String(v));
    });
    setSp(next, { replace: false });
  };

  if (!q.trim()) return <p className="state">Escribe algo para buscar.</p>;
  if (loading && !items.length) return <p className="state">Cargando…</p>;
  if (error) return <p className="state error">{error}</p>;

  return (
    <div className="search-page">
      <header className="head">
        <h1>Resultados para “{q}”</h1>
        <div className="filters">
          <label>Disponibilidad:
            <select value={String(available)} onChange={(e)=>{
              const v = e.target.value;
              setParams({ available: v === 'true' ? 'true' : v === 'false' ? 'false' : null, page: 1 });
            }}>
              <option value="undefined">Todas</option>
              <option value="true">Solo disponibles</option>
              <option value="false">No disponibles</option>
            </select>
          </label>
          <label>Ordenar por:
            <select value={sort} onChange={(e)=> setParams({ sort: e.target.value, page: 1 })}>
              <option value="title">Título</option>
              <option value="author">Autor</option>
              <option value="created_at">Recientes</option>
            </select>
          </label>
          <label>Orden:
            <select value={order} onChange={(e)=> setParams({ order: e.target.value, page: 1 })}>
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </label>
          <label>Por página:
            <select value={limit} onChange={(e)=> setParams({ limit: Number(e.target.value), page: 1 })}>
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
        <button disabled={page<=1} onClick={()=> setParams({ page: page-1 })}>Anterior</button>
        <span>{page} / {pages}</span>
        <button disabled={page>=pages} onClick={()=> setParams({ page: page+1 })}>Siguiente</button>
      </div>
    </div>
  );
}
