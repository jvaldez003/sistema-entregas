import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './DashboardPage.module.css'

export default function DashboardPage({ session }) {
  const [stats, setStats]   = useState({ total: 0, mes: 0, hoy: 0, recursos: {} })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const hoy  = new Date().toISOString().slice(0, 10)
      const mes  = new Date().toISOString().slice(0, 7)

      const { data } = await supabase
        .from('entregas')
        .select('*')
        .order('created_at', { ascending: false })

      if (!data) return setLoading(false)

      const total    = data.length
      const hoyCount = data.filter(r => r.fecha === hoy).length
      const mesCount = data.filter(r => r.fecha?.startsWith(mes)).length

      const recursos = {}
      data.forEach(r => {
        if (r.recurso) recursos[r.recurso] = (recursos[r.recurso] || 0) + 1
      })

      setStats({ total, hoy: hoyCount, mes: mesCount, recursos })
      setRecent(data.slice(0, 8))
      setLoading(false)
    }
    load()
  }, [])

  const topRecurso = Object.entries(stats.recursos).sort((a,b) => b[1]-a[1])[0]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.sub}>Bienvenido, {session?.user?.email}</p>
        </div>
        <Link to="/nueva" className="btn btn-primary">＋ Nueva entrega</Link>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { label:'Total registros', value: stats.total, icon:'📋', color:'#1e3a5f' },
          { label:'Este mes',        value: stats.mes,   icon:'📅', color:'#2e7d32' },
          { label:'Hoy',             value: stats.hoy,   icon:'⏱', color:'#d4860a' },
          { label:'Recurso más usado', value: topRecurso?.[0] || '—', small: true, icon:'💡', color:'#6a1b9a' },
        ].map(s => (
          <div className={`card ${styles.statCard}`} key={s.label}>
            <div className={styles.statIcon} style={{ background: s.color+'18', color: s.color }}>{s.icon}</div>
            <div className={styles.statVal} style={{ fontSize: s.small ? '16px' : '32px' }}>
              {loading ? '…' : s.value}
            </div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Acciones rápidas</h2>
        <div className={styles.actions}>
          <Link to="/nueva"     className={`card ${styles.actionCard}`}>
            <span className={styles.actionIcon}>＋</span>
            <span>Registrar entrega</span>
          </Link>
          <Link to="/reporte"   className={`card ${styles.actionCard}`}>
            <span className={styles.actionIcon}>⎙</span>
            <span>Generar reporte</span>
          </Link>
          <Link to="/registros" className={`card ${styles.actionCard}`}>
            <span className={styles.actionIcon}>☰</span>
            <span>Ver todos</span>
          </Link>
        </div>
      </div>

      {/* Recent */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Últimos registros</h2>
        <div className="card" style={{ overflow:'hidden' }}>
          {loading ? (
            <p style={{ padding:'24px', color:'var(--text3)', textAlign:'center' }}>Cargando…</p>
          ) : recent.length === 0 ? (
            <p style={{ padding:'24px', color:'var(--text3)', textAlign:'center' }}>
              Aún no hay registros. <Link to="/nueva" style={{ color:'var(--accent2)' }}>Crea el primero →</Link>
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th><th>Docente / Solicitante</th>
                  <th>Recurso</th><th>Aula</th><th>Quién entrega</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id}>
                    <td>{r.fecha}</td>
                    <td>{r.docente}</td>
                    <td><span className="badge badge-blue">{r.recurso}</span></td>
                    <td>{r.aula}</td>
                    <td>{r.quien_entrega || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
