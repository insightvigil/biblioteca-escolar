export default function NavBar() {
  return (
    <header className="navbar">
      <div className="wrap">
        <a className="brand" href="/">Biblioteca</a>
        <nav className="links">
          <a href="/">Inicio</a>
          <a href="/reglamento">Reglamento</a>
        </nav>
      </div>
    </header>
  );
}
