import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useState } from 'react'
import styles from './Layout.module.css'

const NAV = [
  { to: '/',          icon: '⊞',  label: 'Dashboard'     },
  { to: '/nueva',     icon: '＋',  label: 'Nueva entrega' },
  { to: '/registros', icon: '☰',  label: 'Registros'     },
  { to: '/reporte',   icon: '⎙',  label: 'Reporte'       },
  { to: '/admin',     icon: '⚙',  label: 'Usuarios'      },
]

export default function Layout({ session }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const email = session?.user?.email || ''
  const initials = email.slice(0,2).toUpperCase()

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sideTop}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>📦</span>
            {!collapsed && <span className={styles.brandText}>Entregas<br/><small>Recursos Tec.</small></span>}
          </div>
          <button className={`btn btn-icon ${styles.collapseBtn}`} onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{icon}</span>
              {!collapsed && <span className={styles.navLabel}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sideBottom}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{initials}</div>
            {!collapsed && (
              <div className={styles.userMeta}>
                <span className={styles.userEmail}>{email}</span>
                <button className={styles.logoutBtn} onClick={logout}>Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
