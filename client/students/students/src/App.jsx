import { Outlet } from 'react-router';
import NavBar from './components/NavBar/navbar.component';
import './index.css';

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
