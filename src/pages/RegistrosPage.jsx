import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './RegistrosPage.module.css'

export default function RegistrosPage() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroRecurso, setFiltroRecurso] = useState('')
  const [deleting, setDeleting] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('entregas')
      .select('*')
      .order('fecha', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    setDeleting(id)
    await supabase.from('entregas').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  const meses   = [...new Set(rows.map(r => r.fecha?.slice(0,7)).filter(Boolean))].sort().reverse()
  const recursos = [...new Set(rows.map(r => r.recurso).filter(Boolean))].sort()

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.docente?.toLowerCase().includes(q) || r.aula?.toLowerCase().includes(q) || r.recurso?.toLowerCase().includes(q)
    const matchMes    = !filtroMes     || r.fecha?.startsWith(filtroMes)
    const matchRec    = !filtroRecurso || r.recurso === filtroRecurso
    return matchSearch && matchMes && matchRec
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Registros</h1>
          <p className={styles.sub}>{filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrados</p>
        </div>
        <Link to="/nueva" className="btn btn-primary">＋ Nueva entrega</Link>
      </div>

      {/* Filtros */}
      <div className={`card ${styles.filters}`}>
        <input placeholder="🔍  Buscar docente, aula, recurso…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
          <option value="">Todos los meses</option>
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroRecurso} onChange={e => setFiltroRecurso(e.target.value)}>
          <option value="">Todos los recursos</option>
          {recursos.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(search || filtroMes || filtroRecurso) && (
          <button className="btn btn-secondary btn-sm"
            onClick={() => { setSearch(''); setFiltroMes(''); setFiltroRecurso('') }}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflow: 'hidden', marginTop: 16 }}>
        {loading ? (
          <p style={{ padding:'32px', textAlign:'center', color:'var(--text3)' }}>Cargando…</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding:'32px', textAlign:'center', color:'var(--text3)' }}>
            No hay registros que coincidan.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th><th>Fecha</th><th>Docente / Solicitante</th>
                  <th>Recurso</th><th>Aula</th><th>Horario</th><th>Día</th>
                  <th>Quien entrega</th><th>Firma/Recibe</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id}>
                    <td className={styles.num}>{i+1}</td>
                    <td style={{ whiteSpace:'nowrap' }}>{r.fecha}</td>
                    <td>{r.docente}</td>
                    <td><span className="badge badge-blue">{r.recurso}</span></td>
                    <td>{r.aula}</td>
                    <td><span className="badge badge-gray">{r.horario}</span></td>
                    <td>{r.dia}</td>
                    <td>{r.quien_entrega || '—'}</td>
                    <td>{r.firma_quien_recibe || '—'}</td>
                    <td>
                      <button
                        className="btn btn-icon btn-sm"
                        style={{ background:'#fdf0ef', color:'var(--danger)', border:'1px solid #f5c2be' }}
                        onClick={() => handleDelete(r.id)}
                        disabled={deleting === r.id}
                      >
                        {deleting === r.id ? '…' : '🗑'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
