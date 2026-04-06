import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Autocomplete from '../components/Autocomplete'
import ConfirmModal from '../components/ConfirmModal'
import styles from './ListaChequeoPage.module.css'

const LOGO_URL = '/logo_candelaria.png'

const SALON_ITEMS = [
    { key: 'aire', label: 'Aire Acond.', icon: '❄️' },
    { key: 'mesasDocentes', label: 'Mesas/Sillas Doc.', icon: '🪑' },
    { key: 'sillasUniv', label: 'Sillas Univ.', icon: '💺' },
    { key: 'iluminacion', label: 'Iluminación', icon: '💡' },
    { key: 'estadoSalon', label: 'Estado Salón', icon: '🏫' },
]

const COMUNES_ITEMS = [
    { key: 'extintores', label: 'Extintores', icon: '🧯' },
    { key: 'banos', label: 'Baños', icon: '🚻' },
    { key: 'recipientes', label: 'Recipientes Aseo', icon: '🗑️' },
    { key: 'ventanales', label: 'Ventanales', icon: '🪟' },
    { key: 'corredores', label: 'Corredores', icon: '🚶' },
]

function buildChecklistHTML({ data, logoUrl }) {
    const { fecha, colaborador, salones, comunes } = data
    const fmtFecha = f => {
        if (!f) return ''
        const [y, m, d] = f.split('-').map(Number)
        const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        return `${d.toString().padStart(2, '0')} de ${meses[m]} de ${y}`
    }
    const check = val => val
        ? `<span style="color:#1a6b2a;font-weight:900;font-size:14px">✔</span>`
        : `<span style="color:#ccc;font-size:13px">—</span>`

    const salonesRows = salones.map((s, i) => `
    <tr style="background:${i % 2 === 0 ? '#f5f5f5' : '#ffffff'}">
      <td style="text-align:center;font-weight:700;font-size:11px">${i + 1}</td>
      <td style="font-weight:700;font-size:11px">${s.nombre || ''}</td>
      <td style="text-align:center">${check(s.aire)}</td>
      <td style="text-align:center">${check(s.mesasDocentes)}</td>
      <td style="text-align:center">${check(s.sillasUniv)}</td>
      <td style="text-align:center">${check(s.iluminacion)}</td>
      <td style="text-align:center">${check(s.estadoSalon)}</td>
      <td style="font-size:10px">${s.observacion || ''}</td>
    </tr>`).join('')

    return `<!DOCTYPE html><html lang="es"><head>
  <meta charset="UTF-8"/>
  <title>Lista de Chequeo</title>
  <style>
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; box-sizing:border-box; margin:0; padding:0; }
    @page { size: A4 landscape; margin: 8mm; }
    body { font-family:Arial,sans-serif; font-size:11px; color:#000; background:#fff; }

    .header-box { border:1.5px solid #000; display:flex; align-items:stretch; overflow:hidden; }
    .header-logo { width:80px; min-height:70px; border-right:1.5px solid #000; display:flex; align-items:center; justify-content:center; padding:4px; flex-shrink:0; }
    .header-logo img { max-width:75px; max-height:65px; object-fit:contain; }
    .header-titles { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:8px 16px; }
    .header-org { font-size:12px; font-weight:700; text-align:center; color:#000; }
    .header-doc { font-size:14px; font-weight:900; text-align:center; color:#000; margin-top:4px; letter-spacing:0.5px; }

    .info-row { display:flex; border:1.5px solid #000; border-top:none; margin-bottom:10px; }
    .info-cell { padding:5px 10px; font-size:11px; display:flex; align-items:center; gap:6px; }
    .info-cell.label { background:#d9d9d9; font-weight:700; flex-shrink:0; font-size:10px; }
    .info-cell.value { flex:1; border-right:1px solid #ccc; font-weight:600; }
    .info-cell.value:last-child { border-right:none; }

    .section-title { font-size:11px; font-weight:800; background:#d9d9d9; color:#000; padding:4px 8px; border:1.5px solid #000; border-bottom:none; letter-spacing:0.5px; text-transform:uppercase; }

    table { width:100%; border-collapse:collapse; border:1.5px solid #000; margin-bottom:10px; }
    th { background:#d9d9d9; font-weight:700; font-size:9px; text-transform:uppercase; padding:5px 4px; text-align:center; border:1px solid #999; color:#000; }
    td { padding:6px 4px; border:1px solid #ccc; vertical-align:middle; height:32px; font-size:10px; }

    .comunes-grid { display:grid; grid-template-columns:repeat(5,1fr) 2fr; border:1.5px solid #000; margin-bottom:10px; }
    .comun-cell { padding:8px 6px; border-right:1px solid #ccc; text-align:center; }
    .comun-cell:last-child { border-right:none; text-align:left; padding:8px 6px; }
    .comun-label { font-size:9px; font-weight:700; text-transform:uppercase; color:#555; margin-bottom:6px; letter-spacing:0.3px; }
    .comun-check { font-size:16px; }

    .firmas-row { display:flex; justify-content:space-around; margin-top:15px; gap:30px; page-break-inside: avoid; }
    .firma-box { text-align:center; flex:1; max-width:280px; }
    .firma-line { border-bottom:1.5px solid #000; margin-bottom:4px; height:35px; }
    .firma-label { background:#d9d9d9; border:1px solid #999; font-weight:700; font-size:10px; color:#000; padding:4px 8px; }
  </style>
  </head><body>
  <div class="header-box">
    <div class="header-logo">
      <img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />
    </div>
    <div class="header-titles">
      <div class="header-org">ALCALDÍA DE CANDELARIA — VALLE DEL CAUCA, COLOMBIA</div>
      <div class="header-doc">LISTA DE CHEQUEO DIARIA — MULTICAMPUS UNIVERSITARIO</div>
    </div>
  </div>
  <div class="info-row">
    <div class="info-cell label">FECHA</div>
    <div class="info-cell value">${fmtFecha(fecha)}</div>
    <div class="info-cell label">COLABORADOR</div>
    <div class="info-cell value">${colaborador}</div>
  </div>

  <div class="section-title">Revisión de Salones</div>
  <table>
    <thead><tr>
      <th style="width:28px">#</th>
      <th style="width:12%">SALÓN</th>
      <th style="width:11%">AIRE ACONDICIONADO</th>
      <th style="width:13%">MESAS/SILLAS DOCENTES</th>
      <th style="width:11%">SILLAS UNIVERSITARIAS</th>
      <th style="width:11%">ILUMINACIÓN</th>
      <th style="width:11%">ESTADO SALÓN</th>
      <th>OBSERVACIONES</th>
    </tr></thead>
    <tbody>${salonesRows}</tbody>
  </table>

  <div class="section-title">Revisión de Áreas Comunes</div>
  <div class="comunes-grid">
    ${COMUNES_ITEMS.map(item => `
    <div class="comun-cell">
      <div class="comun-label">${item.label}</div>
      <div class="comun-check">${comunes[item.key]
            ? '<span style="color:#1a6b2a;font-weight:900;font-size:20px">✔</span>'
            : '<span style="color:#ccc">—</span>'}</div>
    </div>`).join('')}
    <div class="comun-cell">
      <div class="comun-label">Observaciones</div>
      <div style="font-size:10px;margin-top:4px">${comunes.observacion || ''}</div>
    </div>
  </div>

  <div class="firmas-row">
    <div class="firma-box">
      <div class="firma-line"></div>
      <div class="firma-label">Firma del Colaborador<br/>${colaborador}</div>
    </div>
    <div class="firma-box">
      <div class="firma-line"></div>
      <div class="firma-label">Firma del Líder del Proceso</div>
    </div>
  </div>
  </body></html>`
}

export default function ListaChequeoPage() {
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [colaborador, setColaborador] = useState('')
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [colaboradoresDisponibles, setColaboradoresDisponibles] = useState([])
    const [view, setView] = useState('form')
    const [history, setHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [filtroColaborador, setFiltroColaborador] = useState('')
    const [colaboradoresHistory, setColaboradoresHistory] = useState([])

    const [salones, setSalones] = useState([
        { id: 1, nombre: 'Salón 1', aire: false, mesasDocentes: false, sillasUniv: false, iluminacion: false, estadoSalon: false, observacion: '' }
    ])
    const [comunes, setComunes] = useState({
        extintores: false, banos: false, recipientes: false, ventanales: false, corredores: false, observacion: ''
    })

    useEffect(() => {
        supabase.from('entregadores').select('nombre').order('nombre')
            .then(({ data }) => setColaboradoresDisponibles((data || []).map(d => d.nombre)))
    }, [])

    async function loadHistory() {
        setLoadingHistory(true)
        const { data } = await supabase.from('lista_chequeo').select('*').order('created_at', { ascending: false })
        setHistory(data || [])
        const unique = [...new Set((data || []).map(r => r.colaborador).filter(Boolean))].sort()
        setColaboradoresHistory(unique)
        setLoadingHistory(false)
    }

    useEffect(() => { if (view === 'history') loadHistory() }, [view])

    function addSalon() {
        const nextNum = salones.length + 1
        setSalones([...salones, { id: Date.now(), nombre: `Salón ${nextNum}`, aire: false, mesasDocentes: false, sillasUniv: false, iluminacion: false, estadoSalon: false, observacion: '' }])
    }

    function removeSalon(id) {
        if (salones.length === 1) return
        setSalones(salones.filter(s => s.id !== id))
    }

    function updateSalon(id, field, value) {
        setSalones(salones.map(s => s.id === id ? { ...s, [field]: value } : s))
    }

    function resetForm() {
        setFecha(new Date().toISOString().split('T')[0])
        setColaborador('')
        setSalones([{ id: 1, nombre: 'Salón 1', aire: false, mesasDocentes: false, sillasUniv: false, iluminacion: false, estadoSalon: false, observacion: '' }])
        setComunes({ extintores: false, banos: false, recipientes: false, ventanales: false, corredores: false, observacion: '' })
        setEditId(null)
    }

    function editarChequeo(record) {
        setEditId(record.id)
        setFecha(record.fecha)
        setColaborador(record.colaborador)
        setSalones(record.data.salones || [])
        setComunes(record.data.comunes || { extintores: false, banos: false, recipientes: false, ventanales: false, corredores: false, observacion: '' })
        setView('form')
    }

    async function eliminarChequeo() {
        if (!confirmDeleteId) return
        setDeleting(true)
        await supabase.from('lista_chequeo').delete().eq('id', confirmDeleteId)
        setDeleting(false)
        setConfirmDeleteId(null)
        loadHistory()
    }

    async function guardar() {
        if (!fecha || !colaborador) return alert('La fecha y el colaborador son obligatorios.')
        setSaving(true)
        const payload = { fecha, colaborador, data: { fecha, colaborador, salones, comunes } }
        if (editId) {
            await supabase.from('lista_chequeo').update(payload).eq('id', editId)
        } else {
            await supabase.from('lista_chequeo').insert(payload)
        }
        setSaving(false)
        resetForm()
        setView('history')
    }

    function generarPDF(data) {
        const win = window.open('', '_blank', 'width=1100,height=800')
        win.document.write(buildChecklistHTML({ data, logoUrl: window.location.origin + LOGO_URL }))
        win.document.close()
        setTimeout(() => win.print(), 400)
    }

    const filteredHistory = history.filter(r => !filtroColaborador || r.colaborador === filtroColaborador)

    // Conteo de checks completos en un salon
    const salonScore = s => SALON_ITEMS.filter(i => s[i.key]).length

    return (
        <div className={styles.page}>
            <ConfirmModal
                open={!!confirmDeleteId}
                titulo="Eliminar chequeo"
                mensaje="¿Eliminar esta lista de chequeo? Esta acción no se puede deshacer."
                onConfirm={eliminarChequeo}
                onCancel={() => setConfirmDeleteId(null)}
            />

            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.title}>Lista de Chequeo Diaria</h1>
                    <p className={styles.sub}>Revisión de salones y áreas comunes</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {view === 'form' ? (
                        <button className="btn btn-secondary" onClick={() => { setView('history'); resetForm() }}>
                            📋 Ver Historial
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={() => { setView('form'); resetForm() }}>
                            ＋ Nuevo Chequeo
                        </button>
                    )}
                </div>
            </div>

            {view === 'form' ? (
                <>
                    {/* Info básica */}
                    <div className={styles.infoCard}>
                        <div className={styles.infoGrid}>
                            <div className={styles.field}>
                                <label className={styles.label}>📅 Fecha</label>
                                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>👤 Colaborador</label>
                                <Autocomplete
                                    value={colaborador}
                                    onChange={v => setColaborador(v)}
                                    options={colaboradoresDisponibles}
                                    placeholder="Seleccionar colaborador…"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Salones */}
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <div>
                                <h2 className={styles.sectionTitle}>🏫 Revisión de Salones</h2>
                                <p className={styles.sectionSub}>{salones.length} salón{salones.length !== 1 ? 'es' : ''} — marca los ítems en buen estado</p>
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={addSalon}>＋ Agregar Salón</button>
                        </div>

                        <div className={styles.salonesGrid}>
                            {salones.map((s, idx) => {
                                const score = salonScore(s)
                                const pct = Math.round(score / SALON_ITEMS.length * 100)
                                return (
                                    <div key={s.id} className={styles.salonCard}>
                                        <div className={styles.salonCardHeader}>
                                            <div className={styles.salonNum}>#{idx + 1}</div>
                                            <input
                                                className={styles.salonNombre}
                                                value={s.nombre}
                                                onChange={e => updateSalon(s.id, 'nombre', e.target.value)}
                                                placeholder="Nombre del salón (ej: Sala 101)"
                                            />
                                            <div className={styles.salonScore} style={{ color: pct === 100 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626' }}>
                                                {score}/{SALON_ITEMS.length}
                                            </div>
                                            {salones.length > 1 &&
                                                <button className={styles.salonDel} onClick={() => removeSalon(s.id)}>✕</button>}
                                        </div>

                                        <div className={styles.checksGrid}>
                                            {SALON_ITEMS.map(item => (
                                                <button
                                                    key={item.key}
                                                    className={`${styles.checkBtn} ${s[item.key] ? styles.checkBtnOn : ''}`}
                                                    onClick={() => updateSalon(s.id, item.key, !s[item.key])}
                                                >
                                                    <span className={styles.checkBtnIcon}>{item.icon}</span>
                                                    <span className={styles.checkBtnLabel}>{item.label}</span>
                                                    <span className={styles.checkBtnMark}>{s[item.key] ? '✔' : '○'}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className={styles.obsRow}>
                                            <input
                                                value={s.observacion}
                                                onChange={e => updateSalon(s.id, 'observacion', e.target.value)}
                                                placeholder="Observaciones del salón…"
                                                className={styles.obsInput}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                            <button className="btn btn-secondary" style={{ width: '100%', maxWidth: '300px', padding: '10px', fontSize: '14px', borderRadius: '8px' }} onClick={addSalon}>
                                ＋ Agregar otro Salón
                            </button>
                        </div>
                    </div>

                    {/* Áreas comunes */}
                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>🏢 Áreas Comunes</h2>
                        <p className={styles.sectionSub}>Marca los ítems en buen estado</p>
                        <div className={styles.comunesGrid}>
                            {COMUNES_ITEMS.map(item => (
                                <button
                                    key={item.key}
                                    className={`${styles.checkBtn} ${comunes[item.key] ? styles.checkBtnOn : ''}`}
                                    onClick={() => setComunes(c => ({ ...c, [item.key]: !c[item.key] }))}
                                >
                                    <span className={styles.checkBtnIcon}>{item.icon}</span>
                                    <span className={styles.checkBtnLabel}>{item.label}</span>
                                    <span className={styles.checkBtnMark}>{comunes[item.key] ? '✔' : '○'}</span>
                                </button>
                            ))}
                        </div>
                        <div className={styles.field} style={{ marginTop: 12 }}>
                            <label className={styles.label}>Observaciones generales</label>
                            <textarea rows={2} value={comunes.observacion}
                                onChange={e => setComunes(c => ({ ...c, observacion: e.target.value }))}
                                placeholder="Notas sobre áreas comunes…" />
                        </div>
                    </div>

                    {/* Acciones */}
                    <div className={styles.actions}>
                        <button className="btn btn-secondary"
                            onClick={() => generarPDF({ fecha, colaborador, salones, comunes })}>
                            ⎙ Vista previa PDF
                        </button>
                        <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                            {saving ? 'Guardando…' : '💾 Guardar Chequeo'}
                        </button>
                    </div>
                </>
            ) : (
                /* Historial */
                <div className={styles.sectionCard}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                        <select value={filtroColaborador} onChange={e => setFiltroColaborador(e.target.value)}>
                            <option value="">Todos los colaboradores</option>
                            {colaboradoresHistory.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {filtroColaborador &&
                            <button className="btn btn-secondary btn-sm" onClick={() => setFiltroColaborador('')}>✕ Limpiar</button>}
                        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text2)', alignSelf: 'center' }}>
                            {filteredHistory.length} chequeo{filteredHistory.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {loadingHistory ? (
                        <p style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Cargando…</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className={styles.histTable}>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Colaborador</th>
                                        <th>Salones</th>
                                        <th>Áreas comunes</th>
                                        <th style={{ width: 130 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistory.map((r, i) => {
                                        const salonesOk = (r.data?.salones || []).every(s => SALON_ITEMS.every(it => s[it.key]))
                                        const comunesOk = COMUNES_ITEMS.every(it => r.data?.comunes?.[it.key])
                                        return (
                                            <tr key={r.id || i}>
                                                <td style={{ whiteSpace: 'nowrap' }}>{r.fecha}</td>
                                                <td style={{ fontWeight: 600 }}>{r.colaborador}</td>
                                                <td>
                                                    <span className={styles.histBadge} style={{ background: salonesOk ? '#dcfce7' : '#fef9c3', color: salonesOk ? '#166534' : '#854d0e' }}>
                                                        {(r.data?.salones || []).length} salón{(r.data?.salones || []).length !== 1 ? 'es' : ''}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={styles.histBadge} style={{ background: comunesOk ? '#dcfce7' : '#fef9c3', color: comunesOk ? '#166534' : '#854d0e' }}>
                                                        {comunesOk ? '✔ Completo' : '⚠ Pendiente'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="btn btn-icon btn-sm"
                                                            style={{ background: '#e8eef7', color: 'var(--accent)', border: '1px solid #c8d4e8' }}
                                                            onClick={() => editarChequeo(r)}>✎</button>
                                                        <button className="btn btn-icon btn-sm"
                                                            style={{ background: '#fdf0ef', color: 'var(--danger)', border: '1px solid #f5c2be' }}
                                                            onClick={() => setConfirmDeleteId(r.id)} disabled={deleting}>🗑</button>
                                                        <button className="btn btn-secondary btn-sm"
                                                            onClick={() => r.data && generarPDF(r.data)}>📄 PDF</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {filteredHistory.length === 0 && (
                                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Sin chequeos registrados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}