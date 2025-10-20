import { Link, NavLink, Outlet, useLocation } from 'react-router'
import '../styles/main.scss'

export default function AppLayout() {
  const { pathname } = useLocation()
  const isActive = (to) => (pathname === to || pathname.startsWith(to + '/'))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          {import.meta.env.VITE_APP_NAME || 'Admin'}
        </div>
        <nav className="nav">
          <NavLink to="/" end className={isActive('/') ? 'active' : ''}>Dashboard</NavLink>
          <NavLink to="/books" className={isActive('/books') ? 'active' : ''}>Libros</NavLink>
          <NavLink to="/categories" className={isActive('/categories') ? 'active' : ''}>Categorías</NavLink>
          <NavLink to="/loans" className={isActive('/loans') ? 'active' : ''}>Préstamos</NavLink>
          <NavLink to="/settings" className={isActive('/settings') ? 'active' : ''}>Ajustes</NavLink>
        </nav>
      </aside>

      <main>
        <header className="header">
          <Link to="/">Inicio</Link>
        </header>
        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
