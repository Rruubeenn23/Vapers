import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Layout.css';

function NavItem({ to, icon, label, onClick }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`nav-item ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <span className="icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} />
      <span className="label">{label}</span>
    </Link>
  );
}

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(o => !o);
  const close = () => setOpen(false);

  // Evitar scroll de fondo cuando el drawer está abierto en móvil
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 980px)').matches;
    if (isMobile) document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const logo = `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M12 2c-2.5 0-4.5 2-4.5 4.5v1.2c-2.3.9-4 3.1-4 5.8C3.5 17.5 7 21 12 21s8.5-3.5 8.5-7.5c0-2.7-1.7-5-4-5.8V6.5C16.5 4 14.5 2 12 2zm-3 4.5C9 5.1 10.3 4 12 4s3 1.1 3 2.5V7h-6v-.5zM12 19c-3.6 0-6.5-2.6-6.5-5.5 0-2.5 1.8-4.5 4.2-5.2h4.6c2.4.7 4.2 2.7 4.2 5.2 0 2.9-2.9 5.5-6.5 5.5z"/>
    </svg>
  `;

  const icons = {
    comprar: '<svg viewBox="0 0 24 24"><path d="M7 4h-2l-1 2v2h2l1-2h10l1 2h2v-2l-1-2h-12zm0 6h10l-1.5 8h-7l-1.5-8zm2 10a1 1 0   100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z"/></svg>',
    vender: '<svg viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm0 5h12v2H3v-2zm0 5h18v2H3v-2z"/></svg>',
    nuevo: '<svg viewBox="0 0 24 24"><path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
    estadisticas: '<svg viewBox="0 0 24 24"><path d="M5 9h3v10H5V9zm5-4h3v14h-3V5zm5 7h3v7h-3v-7z"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 4h16v12H5.17L4 17.17V4zm0 14h6v2H4v-2z"/></svg>',
  };

  return (
    <div className={`app-shell ${open ? 'sidebar-open' : ''}`}>
      <aside className="sidebar" aria-label="Menú" aria-hidden={!open && window.matchMedia('(max-width: 980px)').matches}>
        <div className="brand">
          <span className="brand-icon" dangerouslySetInnerHTML={{ __html: logo }} />
          <span className="brand-name">Vapers de Rubén</span>
        </div>
        <nav className="nav">
          {/* <NavItem to="/comprar" icon={icons.comprar} label="Comprar" onClick={close} /> */}
          <NavItem to="/vender" icon={icons.vender} label="Vender" onClick={close} />
          {/* <NavItem to="/nuevo-vaper" icon={icons.nuevo} label="Nuevo Vaper" onClick={close} /> */}
          <NavItem to="/estadisticas" icon={icons.estadisticas} label="Estadísticas" onClick={close} />
          <NavItem to="/salesChat" icon={icons.chat} label="Sales Chat" onClick={close} />
        </nav>
        <div className="sidebar-footer">
          <span className="muted">© {new Date().getFullYear()} Rubén</span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={toggle} aria-expanded={open} aria-controls="sidebar">
            <svg viewBox="0 0 24 24"><path d="M4 7h16v2H4V7zm0 4h16v2H4v-2zm0 4h16v2H4v-2z"/></svg>
          </button>
          <div className="topbar-title">Vapers</div>
        </header>
        <main className="content">{children}</main>
      </div>

      {open && <div className="scrim" onClick={close} aria-hidden />}
    </div>
  );
}
