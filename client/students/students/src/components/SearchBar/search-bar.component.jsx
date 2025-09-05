import { useState } from 'react';
import { fetchSuggest } from '../../services/api';

export default function SearchBar({ onSelect, placeholder = 'Buscar…', minChars = 2 }) {
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);

  async function onInput(e) {
    const value = e.target.value;
    setQ(value);
    if (value.trim().length < minChars) { setSuggestions([]); setOpen(false); return; }
    try {
      const s = await fetchSuggest(value, 8);
      setSuggestions(Array.isArray(s) ? s : []);
      setOpen(true);
    } catch { /* ignore */ }
  }

  function handleSelect(item, e) {
    if (e) e.preventDefault();
    setOpen(false);
    setSuggestions([]);
    setQ('');
    if (typeof onSelect === 'function') onSelect(item);
  }

  return (
    <div className="searchbar" role="search">
      <input
        value={q}
        onInput={onInput}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        aria-label="Buscar libros"
      />
      {open && suggestions.length > 0 && (
        <ul className="suggestions" role="listbox">
          {suggestions.map(s => (
            <li key={s.id}>
              <a href={`/libro/${s.id}`} onClick={(e) => handleSelect(s, e)}>
                <span className="title">{s.title}</span>
                {s.author && <span className="author"> — {s.author}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
