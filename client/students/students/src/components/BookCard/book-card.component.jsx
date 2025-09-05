import { Link } from 'react-router';
import './_book-card.styles.scss';
export default function BookCard({ book, showAvailability = true }) {
  // ¿hay datos suficientes para saber disponibilidad?
  const hasAvailabilityData =
    typeof book?.available === 'boolean' || book?.stock != null;

  // Derivar disponibilidad solo si hay datos
  const available = typeof book?.available === 'boolean'
    ? book.available
    : (book?.stock != null ? Number(book.stock) > 0 : null);

  return (
    <Link className="book-card" to={`/libro/${book.id}`}>
      {book.cover_url ? (
        <img
          src={book.cover_url}
          alt={book.title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.add('show');
          }}
        />
      ) : (<div className="ph">Sin portada</div>)}
      
      <div className="info">
        <h3 title={book.title}>{book.title}</h3>
        {book.author && <p className="muted">{book.author}</p>}

        {showAvailability && hasAvailabilityData && available !== null && (
          <p className={available ? 'ok' : 'bad'}>
            {available ? 'Disponible' : 'Agotado'}
          </p>
        )}
      </div>
    </Link>
  );
}
