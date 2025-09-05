
export default function CategorySection({ title, categories = [] }) {
  return (
    <section className="category-section">
      <h2>{title}</h2>
      <div className="chips">
        {categories.map(c => <a key={c.id} className="chip" href={`/categoria/${c.id}`}>{c.name}</a>)}
      </div>
    </section>
  );
}
