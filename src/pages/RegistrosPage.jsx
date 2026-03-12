import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Autocomplete from '../components/Autocomplete'
import styles from './RegistrosPage.module.css'

const RECURSOS = [
  'Video Beam', 'Computador Portátil', 'Tableta Gráfica', 'Micrófono',
  'Parlante / Altavoz', 'Cámara Web', 'Cable HDMI', 'Control Remoto',
  'Extensión Eléctrica', 'Otro',
]
const HORARIOS = ['Mañana', 'Tarde', 'Noche']

const EMPTY_EDIT = {
  fecha: '', recurso_sel: '', recurso_otro: '', docente: '',
  aula: '', horario: 'Mañana', dia: '', quien_entrega: '', observaciones: ''
}

export default function RegistrosPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroRecurso, setFiltroRecurso] = useState('')
  const [deleting, setDeleting] = useState(null)

  // Listas autocomplete
  const [docentes, setDocentes] = useState([])
  const [entregadores, setEntregadores] = useState([])

  useEffect(() => {
    supabase.from('docentes').select('nombre').order('nombre')
      .then(({ data }) => setDocentes((data || []).map(d => d.nombre)))
    supabase.from('entregadores').select('nombre').order('nombre')
      .then(({ data }) => setEntregadores((data || []).map(d => d.nombre)))
  }, [])

  // Modal edición
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('entregas').select('*').order('fecha', { ascending: false })
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

  function openEdit(r) {
    const esOtro = !RECURSOS.slice(0, -1).includes(r.recurso)
    setEditForm({
      fecha: r.fecha || '',
      recurso_sel: esOtro ? 'Otro' : (r.recurso || ''),
      recurso_otro: esOtro ? (r.recurso || '') : '',
      docente: r.docente || '',
      aula: r.aula || '',
      horario: r.horario || 'Mañana',
      dia: r.dia || '',
      quien_entrega: r.quien_entrega || '',
      observaciones: r.observaciones || '',
    })
    setEditId(r.id)
    setEditError('')
  }

  function setE(k, v) {
    setEditForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'fecha' && v) {
        const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const [y, m, d] = v.split('-').map(Number)
        next.dia = DIAS[new Date(y, m - 1, d).getDay()]
      }
      return next
    })
  }

  async function handleSave() {
    setEditError('')
    if (!editForm.fecha || !editForm.recurso_sel || !editForm.docente || !editForm.aula)
      return setEditError('Fecha, Recurso, Docente y Aula son obligatorios.')
    if (editForm.recurso_sel === 'Otro' && !editForm.recurso_otro.trim())
      return setEditError('Especifique el recurso.')

    setSaving(true)
    const recurso = editForm.recurso_sel === 'Otro' ? editForm.recurso_otro.trim() : editForm.recurso_sel

    const { error } = await supabase
      .from('entregas')
      .update({
        fecha: editForm.fecha,
        recurso,
        docente: editForm.docente,
        aula: editForm.aula,
        horario: editForm.horario,
        dia: editForm.dia,
        quien_entrega: editForm.quien_entrega,
        observaciones: editForm.observaciones,
      })
      .eq('id', editId)

    setSaving(false)
    if (error) return setEditError('Error: ' + error.message)
    setEditId(null)
    load()
  }

  const meses = [...new Set(rows.map(r => r.fecha?.slice(0, 7)).filter(Boolean))].sort().reverse()
  const recursos = [...new Set(rows.map(r => r.recurso).filter(Boolean))].sort()

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.docente?.toLowerCase().includes(q) || r.aula?.toLowerCase().includes(q) || r.recurso?.toLowerCase().includes(q)
    const matchMes = !filtroMes || r.fecha?.startsWith(filtroMes)
    const matchRec = !filtroRecurso || r.recurso === filtroRecurso
    return matchSearch && matchMes && matchRec
  })

  return (
    <div className={styles.page}>

      {/* ── Modal edición ── */}
      {editId && (
        <div className={styles.modalOverlay} onClick={() => setEditId(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Editar registro</h2>
              <button className={styles.modalClose} onClick={() => setEditId(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.mGrid2}>
                <div className={styles.mField}>
                  <label>Fecha *</label>
                  <input type="date" value={editForm.fecha} onChange={e => setE('fecha', e.target.value)} />
                </div>
                <div className={styles.mField}>
                  <label>Recurso *</label>
                  <select value={editForm.recurso_sel} onChange={e => setE('recurso_sel', e.target.value)}>
                    <option value="">Seleccione…</option>
                    {RECURSOS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {editForm.recurso_sel === 'Otro' && (
                <div className={styles.mField}>
                  <label>Especifique el recurso *</label>
                  <input type="text" value={editForm.recurso_otro}
                    onChange={e => setE('recurso_otro', e.target.value)}
                    placeholder="Nombre del recurso…" />
                </div>
              )}

              <div className={styles.mField}>
                <label>Docente / Solicitante *</label>
                <Autocomplete
                  value={editForm.docente}
                  onChange={v => setE('docente', v)}
                  options={docentes}
                  placeholder="Buscar docente…"
                />
              </div>

              <div className={styles.mGrid3}>
                <div className={styles.mField}>
                  <label>Aula *</label>
                  <input type="text" value={editForm.aula}
                    onChange={e => setE('aula', e.target.value)} placeholder="Ej: 201" />
                </div>
                <div className={styles.mField}>
                  <label>Horario</label>
                  <select value={editForm.horario} onChange={e => setE('horario', e.target.value)}>
                    {HORARIOS.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div className={styles.mField}>
                  <label>Día</label>
                  <input type="text" value={editForm.dia} readOnly
                    style={{ background: '#f4f6f9', cursor: 'not-allowed', color: 'var(--text2)' }} />
                </div>
              </div>

              <div className={styles.mField}>
                <label>Nombre de quien entrega</label>
                <Autocomplete
                  value={editForm.quien_entrega}
                  onChange={v => setE('quien_entrega', v)}
                  options={entregadores}
                  placeholder="Buscar entregador…"
                />
              </div>

              <div className={styles.mField}>
                <label>Observaciones</label>
                <textarea rows={3} value={editForm.observaciones}
                  onChange={e => setE('observaciones', e.target.value)}
                  placeholder="Notas adicionales…" />
              </div>

              {editError && <div className={styles.modalError}>{editError}</div>}
            </div>

            <div className={styles.modalFooter}>
              <button className="btn btn-secondary" onClick={() => setEditId(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : '✓ Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)' }}>Cargando…</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)' }}>
            No hay registros que coincidan.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th><th>Fecha</th><th>Docente / Solicitante</th>
                  <th>Recurso</th><th>Aula</th><th>Horario</th><th>Día</th>
                  <th>Quien entrega</th><th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id}>
                    <td className={styles.num}>{i + 1}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.fecha}</td>
                    <td>{r.docente}</td>
                    <td><span className="badge badge-blue">{r.recurso}</span></td>
                    <td>{r.aula}</td>
                    <td><span className="badge badge-gray">{r.horario}</span></td>
                    <td>{r.dia}</td>
                    <td>{r.quien_entrega || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-icon btn-sm"
                          style={{ background: '#e8eef7', color: 'var(--accent)', border: '1px solid #c8d4e8' }}
                          onClick={() => openEdit(r)} title="Editar">✎
                        </button>
                        <button className="btn btn-icon btn-sm"
                          style={{ background: '#fdf0ef', color: 'var(--danger)', border: '1px solid #f5c2be' }}
                          onClick={() => handleDelete(r.id)} disabled={deleting === r.id}>
                          {deleting === r.id ? '…' : '🗑'}
                        </button>
                      </div>
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