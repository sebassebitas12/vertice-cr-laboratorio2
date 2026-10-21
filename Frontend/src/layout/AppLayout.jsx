import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const THEME_KEY = 'vertice-lab-theme';

const navItems = [
  { to: '/', label: 'Catálogo', end: true },
  { to: '/orden/nueva', label: 'Nueva orden' },
  { to: '/ordenes', label: 'Órdenes' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/productos', label: 'Gestión' },
];

function getInitialTheme() {
  return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export default function AppLayout() {
  const { totalItems } = useCart();
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand__wordmark">
            <strong><span className="brand__hot-v">V</span>ÉRTICE CR</strong>
            <small>IMPRESIÓN 3D · LABORATORIO</small>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => isActive ? 'main-nav__link is-active' : 'main-nav__link'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="theme-toggle"
          type="button"
          aria-label={`Cambiar a tema ${nextTheme === 'dark' ? 'oscuro' : 'claro'}`}
          title={`Cambiar a tema ${nextTheme === 'dark' ? 'oscuro' : 'claro'}`}
          onClick={() => setTheme(nextTheme)}
        >
          <span aria-hidden="true">{theme === 'light' ? '☾' : '☼'}</span>
        </button>
        <Link className="cart-link" to="/orden/nueva" aria-label="Abrir carrito">
          <span>Carrito</span><b>{totalItems}</b>
        </Link>
      </header>
      <main className="page-container"><Outlet /></main>
      <footer className="site-footer">
        <span>Vértice CR · Laboratorio 2</span>
        <span>Práctica académica de impresión 3D. Precios y stock simulados.</span>
      </footer>
    </div>
  );
}
