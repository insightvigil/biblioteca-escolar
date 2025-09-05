import { useState } from 'react';
import { fetchSuggest } from '../../services/api';

export default function SearchBar({ onSelect }) {
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  async function onInput(e) {
    const value = e.target.value;
    setQ(value);
    if (value.length < 2) { setSuggestions([]); return; }
    try {
      const s = await fetchSuggest(value, 6);
      setSuggestions(s);
    } catch { /* ignore */ }
  }

  return (
    <div className="searchbar">
      <input value={q} onInput={onInput} placeholder="Buscar libros o autores…" />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map(s => (
            <li key={s.id}>
              <a href={`/libro/${s.id}`} onClick={onSelect}>{s.title} — {s.author}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
