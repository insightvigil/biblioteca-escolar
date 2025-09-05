import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { fetchSuggest } from '../../services/api';

export default function SearchBar({ onSelect, placeholder = 'Buscar…', minChars = 2 }) {
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < minChars) {
      setSuggestions([]); setOpen(false); return;
    }
    timer.current = setTimeout(async () => {
      try {
        const s = await fetchSuggest(q, 8);
        setSuggestions(Array.isArray(s) ? s : []);
        setOpen(true);
        setActive(-1);
      } catch {
        setSuggestions([]); setOpen(false);
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q, minChars]);

  function handleSelect(item, e) {
    if (e) e.preventDefault();
    close();
    onSelect?.(item);
    if (item?.id) navigate(`/libro/${item.id}`);
  }

  function onKeyDown(e) {
    if (!open || !suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0) handleSelect(suggestions[active]);
      else if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      close();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  return (
    <div className="search-bar" onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) close();
    }}>
      <input
        type="search"
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="sb-listbox"
      />
      {open && suggestions.length > 0 && (
        <ul id="sb-listbox" className="suggestions" role="listbox" ref={listRef}>
          {suggestions.map((s, idx) => (
            <li key={s.id}>
              <Link
                to={`/libro/${s.id}`}
                className={idx === active ? 'active' : undefined}
                onMouseEnter={() => setActive(idx)}
                onClick={(e) => handleSelect(s, e)}
                role="option"
                aria-selected={idx === active}
              >
                <span className="title">{s.title}</span>
                {s.author && <span className="author"> — {s.author}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
