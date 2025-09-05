import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import SearchBar from '../SearchBar/search-bar.component';
import CarticaturaLogo from '../../assets/Logo-Atitalaquia-Caricatura.png'
import TecnmLogo from '../../assets/Logo-TECNM.png'

import './navbar.styles.scss'

export default function NavBar() {
  const navigate = useNavigate();

  const handleSelect = useCallback((item) => {
    if (!item?.id) return;
    navigate(`/libro/${item.id}`);
  }, [navigate]);

  return (
    <header className="navbar">
      <div className="wrap">
        <Link className="brand" to="/"> 
          <div className='logos'>
            <img src={TecnmLogo} alt="TECNM" />
            
            <img src={CarticaturaLogo} alt="Logo Itat" />
          </div>
          <span> ¡Bienvenido a la Biblioteca Digital! </span>
        </Link>

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
