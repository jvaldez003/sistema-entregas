import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './FormPage.module.css'

const RECURSOS = [
  'Video Beam', 'Computador Portátil', 'Tableta Gráfica', 'Micrófono',
  'Parlante / Altavoz', 'Cámara Web', 'Cable HDMI', 'Control Remoto',
  'Extensión Eléctrica', 'Otro',
]
const HORARIOS = ['Mañana', 'Tarde', 'Noche']

const EMPTY = {
  fecha: '', recurso: '', recurso_otro: '', docente: '', aula: '',
  horario: 'Mañana', dia: '', quien_entrega: '', observaciones: '',
}

export default function NuevaEntregaPage({ session }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...EMPTY })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  function set(k, v) {
    if (k === 'fecha' && v) {
      // Calcular el día automáticamente — sumar offset para evitar desfase de zona horaria
      const [y, m, d] = v.split('-').map(Number)
      const fecha = new Date(y, m - 1, d)
      const dia = DIAS_ES[fecha.getDay()]
      setForm(f => ({ ...f, fecha: v, dia }))
    } else {
      setForm(f => ({ ...f, [k]: v }))
    }
  }

  const recursoFinal = form.recurso === 'Otro' ? form.recurso_otro : form.recurso

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.fecha || !form.recurso || !form.docente || !form.aula) {
      return setError('Los campos Fecha, Recurso, Docente y Aula son obligatorios.')
    }
    if (form.recurso === 'Otro' && !form.recurso_otro.trim()) {
      return setError('Por favor especifique el recurso tecnológico.')
    }
    setLoading(true)
    const { error: err } = await supabase.from('entregas').insert([{
      fecha: form.fecha,
      recurso: recursoFinal,
      docente: form.docente,
      aula: form.aula,
      horario: form.horario,
      dia: form.dia,
      quien_entrega: form.quien_entrega,
      firma_quien_recibe: '',   // siempre vacío — se firma en el reporte impreso
      observaciones: form.observaciones,
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
          <Field label="Fecha *">
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
          </Field>
          <Field label="Recurso tecnológico *">
            <select value={form.recurso} onChange={e => set('recurso', e.target.value)} required>
              <option value="">Seleccione…</option>
              {RECURSOS.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
        </div>

        {/* Campo adicional si selecciona Otro */}
        {form.recurso === 'Otro' && (
          <Field label="Especifique el recurso *">
            <input
              type="text"
              value={form.recurso_otro}
              onChange={e => set('recurso_otro', e.target.value)}
              placeholder="Escriba el nombre del recurso…"
              autoFocus
              required
            />
          </Field>
        )}

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
            <input
              type="text"
              value={form.dia || '—'}
              readOnly
              style={{ background: '#f4f6f9', color: 'var(--text2)', cursor: 'not-allowed' }}
            />
          </Field>
        </div>

        <Field label="Nombre de quien entrega">
          <input type="text" value={form.quien_entrega}
            onChange={e => set('quien_entrega', e.target.value)}
            placeholder="Nombre del responsable" />
        </Field>

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