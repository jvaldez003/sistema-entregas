import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useState } from 'react'
import styles from './Layout.module.css'

const NAV = [
  { to: '/', icon: '⊞', label: 'Dashboard' },
  { to: '/nueva', icon: '＋', label: 'Nueva' },
  { to: '/registros', icon: '☰', label: 'Registros' },
  { to: '/reporte', icon: '⎙', label: 'Reporte' },
  { to: '/admin', icon: '⚙', label: 'Usuarios' },
]

function Logo({ size = 28 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"
      width={size} height={size} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4fc3f7" />
          <stop offset="100%" stopColor="#81d4fa" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="rgba(255,255,255,0.15)" />
      <rect x="10" y="12" width="44" height="28" rx="4" fill="none" stroke="white" strokeWidth="2.5" />
      <line x1="32" y1="40" x2="32" y2="48" stroke="white" strokeWidth="2.5" />
      <line x1="22" y1="48" x2="42" y2="48" stroke="white" strokeWidth="2.5" />
      <polyline points="20,26 28,34 44,18" fill="none" stroke="url(#lg)"
        strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Layout({ session }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const email = session?.user?.email || ''
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>

      {/* Overlay drawer móvil */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.sideTop}>
          <div className={styles.brand}>
            <Logo />
            {!collapsed && (
              <span className={styles.brandText}>
                Entregas<br /><small>Recursos Tec.</small>
              </span>
            )}
          </div>
          <button className={`btn btn-icon ${styles.collapseBtn}`} onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '›' : '‹'}
          </button>
          <button className={styles.closeBtn} onClick={() => setMobileOpen(false)}>✕</button>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className={styles.navIcon}>{icon}</span>
              {!collapsed && <span className={styles.navLabel}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Pie sidebar */}
        <div className={styles.sideBottom}>
          <div className={styles.avatar}>{initials}</div>
          {!collapsed && (
            <div className={styles.userInfo}>
              <span className={styles.userEmail}>{email}</span>
              <button className={styles.logoutBtn} onClick={logout}>
                ⇠ Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={styles.main}>
        {/* Topbar móvil */}
        <div className={styles.topbar}>
          <button className={styles.menuBtn}
            onClick={() => { setCollapsed(false); setMobileOpen(o => !o) }}>
            ☰
          </button>
          <span className={styles.topbarTitle}>
            <Logo size={24} /> Entregas
          </span>
          <button className={styles.topbarLogout} onClick={logout}>
            ⇠ Salir
          </button>
        </div>

        <div className={styles.content}>
          <Outlet />
        </div>
      </main>

      {/* Bottom nav móvil */}
      <nav className={styles.bottomNav}>
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            className={({ isActive }) => `${styles.bottomItem} ${isActive ? styles.bottomActive : ''}`}
          >
            <span className={styles.bottomIcon}>{icon}</span>
            <span className={styles.bottomLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  )
}