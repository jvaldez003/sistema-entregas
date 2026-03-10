import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './FormPage.module.css'

const RECURSOS = [
  'Video Beam','Computador Portátil','Tableta Gráfica','Micrófono',
  'Parlante / Altavoz','Cámara Web','Cable HDMI','Control Remoto',
  'Extensión Eléctrica','Otro',
]
const HORARIOS = ['Mañana','Tarde']
const DIAS     = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

const EMPTY = {
  fecha:'', recurso:'', docente:'', aula:'',
  horario:'Mañana', dia:'Lunes', quien_entrega:'', firma_quien_recibe:'', observaciones:'',
}

export default function NuevaEntregaPage({ session }) {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ ...EMPTY })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.fecha || !form.recurso || !form.docente || !form.aula) {
      return setError('Los campos Fecha, Recurso, Docente y Aula son obligatorios.')
    }
    setLoading(true)
    const { error: err } = await supabase.from('entregas').insert([{
      ...form,
      user_id: session.user.id,
    }])
    setLoading(false)
    if (err) return setError('Error al guardar: ' + err.message)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); setForm({ ...EMPTY }) }, 2000)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Nueva entrega</h1>
          <p className={styles.sub}>Registre la entrega de un recurso tecnológico</p>
        </div>
      </div>

      {success && (
        <div className={styles.successBanner}>
          ✅ Registro guardado correctamente
        </div>
      )}

      <form className={`card ${styles.form}`} onSubmit={handleSubmit}>
        <div className={styles.grid2}>
          <Field label="Fecha *" required>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
          </Field>
          <Field label="Recurso tecnológico *" required>
            <select value={form.recurso} onChange={e => set('recurso', e.target.value)} required>
              <option value="">Seleccione…</option>
              {RECURSOS.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Docente / Solicitante *">
          <input type="text" value={form.docente}
            onChange={e => set('docente', e.target.value)}
            placeholder="Nombre completo" required />
        </Field>

        <div className={styles.grid3}>
          <Field label="Aula *">
            <input type="text" value={form.aula}
              onChange={e => set('aula', e.target.value)}
              placeholder="Ej: 201" required />
          </Field>
          <Field label="Horario">
            <select value={form.horario} onChange={e => set('horario', e.target.value)}>
              {HORARIOS.map(h => <option key={h}>{h}</option>)}
            </select>
          </Field>
          <Field label="Día">
            <select value={form.dia} onChange={e => set('dia', e.target.value)}>
              {DIAS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </div>

        <div className={styles.grid2}>
          <Field label="Nombre de quien entrega">
            <input type="text" value={form.quien_entrega}
              onChange={e => set('quien_entrega', e.target.value)}
              placeholder="Nombre del responsable" />
          </Field>
          <Field label="Firma / nombre de quien recibe">
            <input type="text" value={form.firma_quien_recibe}
              onChange={e => set('firma_quien_recibe', e.target.value)}
              placeholder="Nombre o iniciales" />
          </Field>
        </div>

        <Field label="Observaciones">
          <textarea rows={3} value={form.observaciones}
            onChange={e => set('observaciones', e.target.value)}
            placeholder="Notas adicionales sobre la entrega…" />
        </Field>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/registros')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Guardando…' : '✓ Guardar registro'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  )
}
