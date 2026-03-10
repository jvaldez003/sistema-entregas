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
            <span className={styles.brandIcon}>📦</span>
            {!collapsed && <span className={styles.brandText}>Entregas<br /><small>Recursos Tec.</small></span>}
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

        {/* ── Pie del sidebar: usuario + cerrar sesión directo ── */}
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
          <button className={styles.menuBtn} onClick={() => { setCollapsed(false); setMobileOpen(o => !o) }}>
            ☰
          </button>
          <span className={styles.topbarTitle}>📦 Entregas</span>
          {/* Cerrar sesión directo en topbar móvil */}
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