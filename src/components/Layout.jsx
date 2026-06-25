import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import styles from './Layout.module.css'

const NAV_GROUPS = [
  {
    group: null,
    items: [
      { to: '/', icon: '⊞', label: 'Dashboard' },
    ]
  },
  {
    group: 'Multicampus',
    items: [
      { to: '/nueva',      icon: '＋',  label: 'Nueva entrega'  },
      { to: '/registros',  icon: '📋',  label: 'Registros'      },
      { to: '/inventario', icon: '📦',  label: 'Inventario'     },
      { to: '/chequeo',    icon: '☑',   label: 'Chequeo'        },
      { to: '/reporte',    icon: '📊',  label: 'Reporte'        },
      { to: '/malla',      icon: '📅',  label: 'Turnos'         },
      { to: '/asistencia', icon: '👥',  label: 'Asistencia'     },
    ]
  },
  {
    group: 'Ruta Universitaria',
    items: [
      { to: '/papeles',     icon: '🎓', label: 'Documentos'     },
      { to: '/comunicados', icon: '✉',  label: 'Comunicados'    },
    ]
  },
  {
    group: 'Sistema',
    items: [
      { to: '/admin', icon: '⚙', label: 'Usuarios' },
    ]
  },
]

// Lista plana para el bottom nav móvil (con separadores)
const BOTTOM_NAV = [
  { to: '/',           icon: '⊞',  label: 'Inicio'     },
  null,
  { to: '/nueva',      icon: '＋',  label: 'Nueva'      },
  { to: '/registros',  icon: '📋',  label: 'Registros'  },
  { to: '/inventario', icon: '📦',  label: 'Inventario' },
  { to: '/chequeo',    icon: '☑',   label: 'Chequeo'    },
  { to: '/reporte',    icon: '📊',  label: 'Reporte'    },
  { to: '/malla',      icon: '📅',  label: 'Turnos'     },
  { to: '/asistencia', icon: '👥',  label: 'Asistencia' },
  null,
  { to: '/papeles',     icon: '🎓', label: 'Documentos' },
  { to: '/comunicados', icon: '✉',  label: 'Comuni...'  },
  null,
  { to: '/admin',       icon: '⚙',  label: 'Usuarios'   },
]

function Logo({ size = 36 }) {
  return (
    <img
      src="/logo_candelaria.png"
      alt="Candelaria"
      width={size}
      height={size}
      style={{ flexShrink: 0, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.3))' }}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

export default function Layout({ session }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [collapsed,   setCollapsed]   = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  // Grupos con nombre empiezan expandidos
  const initialExpanded = Object.fromEntries(
    NAV_GROUPS.filter(g => g.group).map(g => [g.group, true])
  )
  const [expanded, setExpanded] = useState(initialExpanded)

  // Si la ruta activa pertenece a un grupo colapsado, ábrelo
  useEffect(() => {
    NAV_GROUPS.forEach(({ group, items }) => {
      if (!group) return
      const match = items.some(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'))
      if (match) setExpanded(prev => ({ ...prev, [group]: true }))
    })
  }, [location.pathname])

  function toggleGroup(name) {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }))
  }

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const email    = session?.user?.email || ''
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>

      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ''} no-print`}>
        <div className={styles.sideTop}>
          <div className={styles.brand}>
            <Logo />
            {!collapsed && (
              <span className={styles.brandText}>
                Educación Superior<br /><small>Alcaldía de Candelaria</small>
              </span>
            )}
          </div>
          <button className={`btn btn-icon ${styles.collapseBtn}`} onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '›' : '‹'}
          </button>
          <button className={styles.closeBtn} onClick={() => setMobileOpen(false)}>✕</button>
        </div>

        <nav className={styles.nav}>
          {NAV_GROUPS.map(({ group, items }, gi) => {
            const isOpen = !group || collapsed || expanded[group]
            return (
              <div key={gi} className={styles.navGroup}>

                {/* Cabecera de grupo — clicable cuando el sidebar está expandido */}
                {group && !collapsed && (
                  <button
                    className={styles.groupToggle}
                    onClick={() => toggleGroup(group)}
                    title={expanded[group] ? `Colapsar ${group}` : `Expandir ${group}`}
                  >
                    <span className={styles.groupLabel}>{group}</span>
                    <span className={`${styles.groupArrow} ${expanded[group] ? styles.groupArrowOpen : ''}`}>
                      ›
                    </span>
                  </button>
                )}

                {/* Línea divisora cuando sidebar colapsado */}
                {group && collapsed && (
                  <div className={styles.groupDivider} />
                )}

                {/* Items — visibles según estado de expansión (salvo sidebar colapsado) */}
                <div className={`${styles.groupItems} ${isOpen ? styles.groupItemsOpen : ''}`}>
                  <div>
                    {items.map(({ to, icon, label }) => (
                      <NavLink
                        key={to} to={to} end={to === '/'}
                        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? label : undefined}
                      >
                        <span className={styles.navIcon}>{icon}</span>
                        {!collapsed && <span className={styles.navLabel}>{label}</span>}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className={styles.sideBottom}>
          <div className={styles.avatar}>{initials}</div>
          {!collapsed && (
            <div className={styles.userInfo}>
              <span className={styles.userEmail}>{email}</span>
              <button className={styles.logoutBtn} onClick={logout}>⇠ Cerrar sesión</button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={styles.main}>
        <div className={`${styles.topbar} no-print`}>
          <button className={styles.menuBtn}
            onClick={() => { setCollapsed(false); setMobileOpen(o => !o) }}>
            ☰
          </button>
          <span className={styles.topbarTitle}>
            <Logo size={22} /> Educación Superior
          </span>
          <button className={styles.topbarLogout} onClick={logout}>⇠ Salir</button>
        </div>

        <div className={styles.content}>
          <Outlet />
        </div>
      </main>

      {/* ── Bottom nav móvil ── */}
      <nav className={`${styles.bottomNav} no-print`}>
        {BOTTOM_NAV.map((item, i) =>
          item === null ? (
            <div key={`sep-${i}`} className={styles.bottomSep} />
          ) : (
            <NavLink
              key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => `${styles.bottomItem} ${isActive ? styles.bottomActive : ''}`}
            >
              <span className={styles.bottomIcon}>{item.icon}</span>
              <span className={styles.bottomLabel}>{item.label}</span>
            </NavLink>
          )
        )}
      </nav>

    </div>
  )
}
