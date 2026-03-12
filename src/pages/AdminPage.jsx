import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmModal from '../components/ConfirmModal'
import styles from './AdminPage.module.css'

// ── Mini gestor de una lista (docentes o entregadores) ──
function ListaManager({ tabla, titulo, placeholder }) {
  const [items, setItems] = useState([])
  const [nuevo, setNuevo] = useState('')
  const [editId, setEditId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  async function load() {
    const { data } = await supabase.from(tabla).select('*').order('nombre')
    setItems(data || [])
  }

  useEffect(() => { load() }, [tabla])

  async function agregar() {
    if (!nuevo.trim()) return
    setSaving(true); setError('')
    const { error: e } = await supabase.from(tabla).insert([{ nombre: nuevo.trim() }])
    setSaving(false)
    if (e) return setError(e.message)
    setNuevo('')
    load()
  }

  async function guardarEdicion(id) {
    if (!editVal.trim()) return
    setSaving(true); setError('')
    const { error: e } = await supabase.from(tabla).update({ nombre: editVal.trim() }).eq('id', id)
    setSaving(false)
    if (e) return setError(e.message)
    setEditId(null)
    load()
  }

  async function eliminar(id) {
    await supabase.from(tabla).delete().eq('id', id)
    setConfirmId(null)
    load()
  }

  return (
    <div className={`card ${styles.listCard}`}>
      <ConfirmModal
        open={!!confirmId}
        titulo={`Eliminar de ${titulo}`}
        mensaje="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        onConfirm={() => eliminar(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
      <h2 className={styles.cardTitle}>{titulo}
        <span className={styles.badge}>{items.length}</span>
      </h2>

      {/* Agregar nuevo */}
      <div className={styles.addRow}>
        <input
          type="text" value={nuevo} placeholder={placeholder}
          onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregar()}
        />
        <button className="btn btn-primary btn-sm" onClick={agregar} disabled={saving || !nuevo.trim()}>
          ＋ Agregar
        </button>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* Lista */}
      {items.length === 0 ? (
        <p className={styles.empty}>No hay registros aún. Agrega el primero arriba.</p>
      ) : (
        <ul className={styles.list}>
          {items.map(item => (
            <li key={item.id} className={styles.listItem}>
              {editId === item.id ? (
                <div className={styles.editRow}>
                  <input
                    type="text" value={editVal} autoFocus
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') guardarEdicion(item.id)
                      if (e.key === 'Escape') setEditId(null)
                    }}
                  />
                  <button className="btn btn-success btn-sm" onClick={() => guardarEdicion(item.id)} disabled={saving}>✓</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>✕</button>
                </div>
              ) : (
                <div className={styles.itemRow}>
                  <span className={styles.itemName}>{item.nombre}</span>
                  <div className={styles.itemActions}>
                    <button className="btn btn-icon btn-sm"
                      style={{ background: '#e8eef7', color: 'var(--accent)', border: '1px solid #c8d4e8' }}
                      onClick={() => { setEditId(item.id); setEditVal(item.nombre) }}
                      title="Editar">✎
                    </button>
                    <button className="btn btn-icon btn-sm"
                      style={{ background: '#fdf0ef', color: 'var(--danger)', border: '1px solid #f5c2be' }}
                      onClick={() => setConfirmId(item.id)}
                      title="Eliminar">🗑
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Página principal ──
export default function AdminPage({ session }) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Administración</h1>
      <p className={styles.sub}>Gestiona las listas que aparecen en el formulario de registro.</p>

      <div className={styles.grid}>
        <ListaManager
          tabla="docentes"
          titulo="Docentes / Solicitantes"
          placeholder="Nombre del docente…"
        />
        <ListaManager
          tabla="entregadores"
          titulo="Nombre de quien entrega"
          placeholder="Nombre del entregador…"
        />
      </div>

      {/* Info usuarios */}
      <div className={`card ${styles.listCard}`} style={{ marginTop: 16 }}>
        <h2 className={styles.cardTitle}>Usuarios del sistema</h2>
        <ol className={styles.steps}>
          <li>Ve a <strong>supabase.com</strong> → tu proyecto → <strong>Authentication → Users</strong></li>
          <li>Clic en <strong>"Add user" → "Create new user"</strong></li>
          <li>Ingresa correo y contraseña del nuevo usuario</li>
        </ol>
        <div className={styles.sessionRow}>
          <div className={styles.avatar}>{session?.user?.email?.slice(0, 2).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{session?.user?.email}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Sesión activa</div>
          </div>
        </div>
      </div>
    </div>
  )
}