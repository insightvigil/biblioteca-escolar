import { Link } from 'react-router';

export default function BookCard({ book }) {
  return (
    <Link className="book-card" to={`/libro/${book.id}`}>
      {book.cover_url ? (
   <img src={book.cover_url} alt={book.title} loading="lazy"
        onError={(e)=>{ e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.add('show'); }} />
 ) : <div className="ph">Sin portada</div>}
 
      <div className="info">
        <h3 title={book.title}>{book.title}</h3>
        {book.author && <p className="muted">{book.author}</p>}
        <p className={book.available ? 'ok' : 'bad'}>
          {book.available ? 'Disponible' : 'Agotado'}
        </p>
      </div>
    </Link>
  );
}
