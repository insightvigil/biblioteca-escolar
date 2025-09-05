export default function BookCard({ book }) {
  return (
    <a className="book-card" href={`/libro/${book.id}`}>
      {book.cover_url ? (
        <img src={book.cover_url} alt={book.title} />
      ) : (
        <div className="ph">Sin portada</div>
      )}
      <div className="info">
        <h3 title={book.title}>{book.title}</h3>
        {book.author && <p className="muted">{book.author}</p>}
        <p className={book.available ? 'ok' : 'bad'}>
          {book.available ? 'Disponible' : 'Agotado'}
        </p>
      </div>
    </a>
  );
}
