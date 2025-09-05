import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import SearchBar from '../SearchBar/search-bar.component';

export default function NavBar() {
  const navigate = useNavigate();

  const handleSelect = useCallback((item) => {
    if (!item?.id) return;
    navigate(`/libro/${item.id}`);
  }, [navigate]);

  return (
    <header className="navbar">
      <div className="wrap">
        <a className="brand" href="/">Biblioteca</a>

        <div className="nav-center">
          <SearchBar onSelect={handleSelect} placeholder="Buscar por título o autor…" />
        </div>

        <nav className="links">
          <a href="/">Inicio</a>
          <a href="/reglamento">Reglamento</a>
        </nav>
      </div>
    </header>
  );
}
