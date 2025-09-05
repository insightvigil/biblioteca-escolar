import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
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
        <Link className="brand" to="/">Biblioteca</Link>

        <div className="nav-center">
          <SearchBar onSelect={handleSelect} placeholder="Buscar por título o autor…" />
        </div>

        <nav className="links">
          <Link to="/">Inicio</Link>
          <Link to="/reglamento">Reglamento</Link>
        </nav>
      </div>
    </header>
  );
}
