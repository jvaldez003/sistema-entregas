import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './MallaPage.module.css'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const FRANJAS = [
    { id: 'f1', label: '2:00 PM - 6:00 PM' },
    { id: 'f2', label: '6:00 PM - 9:30 PM' },
]
const FRANJAS_SAB = [
    { id: 's1', label: '8:00 AM - 12:45 PM' },
    { id: 's2', label: '2:00 PM - 6:00 PM' },
]

function generarSabados() {
    const sabs = []
    const hoy = new Date()
    let d = new Date(hoy)
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7))
    for (let i = 0; i < 5; i++) {
        sabs.push({ fecha: d.toISOString().slice(0, 10), s1: [], s2: [] })
        d = new Date(d); d.setDate(d.getDate() + 7)
    }
    return sabs
}

const EMPTY_MALLA = {
    titulo: 'CRONOGRAMA DE TURNOS MULTICAMPUS',
    semana: {},
    sabados: generarSabados(),
    directorio: [],
    pvd: [
        { dias: 'Lunes a Viernes', hora: '6:00 PM - 9:30 PM', persona: '' },
        { dias: 'Lunes', hora: '2:00 PM - 6:00 PM', persona: '' },
    ],
}

export default function MallaPage() {
    const [malla, setMalla] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [colaboradores, setColaboradores] = useState([])

    useEffect(() => {
        supabase.from('entregadores').select('nombre').order('nombre')
            .then(({ data }) => {
                setColaboradores((data || []).map(x => x.nombre))
            })

        supabase.from('malla_turnos').select('*').order('created_at', { ascending: false }).limit(1)
            .then(({ data }) => {
                setMalla(data && data.length > 0 ? data[0].datos : { ...EMPTY_MALLA })
                setLoading(false)
            })
    }, [])

    async function guardar() {
        setSaving(true)
        const { data: existing } = await supabase.from('malla_turnos').select('id').limit(1)
        if (existing && existing.length > 0) {
            await supabase.from('malla_turnos').update({ datos: malla }).eq('id', existing[0].id)
        } else {
            await supabase.from('malla_turnos').insert([{ datos: malla }])
        }
        setSaving(false); setSaved(true)
        setTimeout(() => setSaved(false), 2500)
    }

    function setSemana(dia, franja, val) {
        setMalla(m => ({ ...m, semana: { ...m.semana, [`${dia}_${franja}`]: val } }))
    }
    function setSabado(idx, campo, val) {
        setMalla(m => { const s = [...m.sabados]; s[idx] = { ...s[idx], [campo]: val }; return { ...m, sabados: s } })
    }
    function agregarSabado() {
        setMalla(m => {
            const last = m.sabados[m.sabados.length - 1]
            const d = last ? new Date(last.fecha) : new Date()
            d.setDate(d.getDate() + 7)
            return { ...m, sabados: [...m.sabados, { fecha: d.toISOString().slice(0, 10), s1: [], s2: [] }] }
        })
    }
    function eliminarSabado(idx) {
        setMalla(m => ({ ...m, sabados: m.sabados.filter((_, i) => i !== idx) }))
    }
    function setDirectorio(idx, campo, val) {
        setMalla(m => { const d = [...m.directorio]; d[idx] = { ...d[idx], [campo]: val }; return { ...m, directorio: d } })
    }
    function agregarContacto() {
        setMalla(m => ({ ...m, directorio: [...m.directorio, { nombre: '', celular: '' }] }))
    }
    function eliminarContacto(idx) {
        setMalla(m => ({ ...m, directorio: m.directorio.filter((_, i) => i !== idx) }))
    }
    function setPVD(idx, campo, val) {
        setMalla(m => { const p = [...m.pvd]; p[idx] = { ...p[idx], [campo]: val }; return { ...m, pvd: p } })
    }
    function agregarPVD() {
        setMalla(m => ({ ...m, pvd: [...m.pvd, { dias: '', hora: '', persona: '' }] }))
    }
    function eliminarPVD(idx) {
        setMalla(m => ({ ...m, pvd: m.pvd.filter((_, i) => i !== idx) }))
    }
    // Semana: cada celda guarda [{nombre, horaInicio, horaFin}]
    function agregarPersona(dia, franja, nombre) {
        const key = `${dia}_${franja}`
        const actual = normalizar(malla.semana[key] || [])
        if (actual.find(p => p.nombre === nombre)) return
        setSemana(dia, franja, [...actual, { nombre, horaInicio: '', horaFin: '' }])
    }
    function quitarPersona(dia, franja, nombre) {
        const key = `${dia}_${franja}`
        setSemana(dia, franja, normalizar(malla.semana[key] || []).filter(p => p.nombre !== nombre))
    }
    function setHoraPersona(dia, franja, nombre, campo, val) {
        const key = `${dia}_${franja}`
        setSemana(dia, franja, normalizar(malla.semana[key] || []).map(p => p.nombre === nombre ? { ...p, [campo]: val } : p))
    }

    // Sábados: simple, solo nombres (strings)
    function togglePersonaSab(idx, campo, nombre) {
        const actual = normalizar(malla.sabados[idx][campo] || []).map(p => p.nombre)
        const nuevo = actual.includes(nombre) ? actual.filter(n => n !== nombre) : [...actual, nombre]
        setSabado(idx, campo, nuevo)
    }

    // Normaliza semana: string → {nombre, horaInicio:'', horaFin:''}
    // Normaliza también objetos con 'hora' (versión anterior)
    function normalizar(lista) {
        return (lista || []).map(p => {
            if (typeof p === 'string') return { nombre: p, horaInicio: '', horaFin: '' }
            if (p.hora !== undefined) return { nombre: p.nombre, horaInicio: p.hora || '', horaFin: '' }
            return p
        })
    }

    function imprimir() {
        const win = window.open('', '_blank', 'width=1400,height=1000')

        const fmtFecha = f => {
            if (!f) return ''
            const [y, m, d] = f.split('-').map(Number)
            const meses = ['', 'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
            return `${d} ${meses[m]}`
        }

        const celdaSemana = (dia, franja) => {
            const personas = normalizar(malla.semana[`${dia}_${franja}`] || [])
            if (!personas.length) return '<span style="color:#ccc">—</span>'
            return personas.map(p => {
                const horario = p.horaInicio && p.horaFin
                    ? `${p.horaInicio} - ${p.horaFin}`
                    : p.horaInicio || p.horaFin || ''
                return `
        <div class="nbadge">
          ${p.nombre}
          ${horario ? `<span class="nhora">${horario}</span>` : ''}
        </div>`
            }).join('')
        }

        const colSab = ['#111', '#2d2d2d', '#444', '#1a1a1a', '#333']
        const bloquesSabados = malla.sabados.map((s, i) => {
            const s1 = (s.s1 || []).map(p => typeof p === 'string' ? p : p.nombre)
            const s2 = (s.s2 || []).map(p => typeof p === 'string' ? p : p.nombre)
            return `
      <div class="sab-card">
        <div class="sab-head" style="background:${colSab[i % colSab.length]}">${fmtFecha(s.fecha)}</div>
        <div class="sab-body">
          <div class="sab-row">
            <div class="sab-time">8:00 – 12:45 PM</div>
            <div class="sab-names">${s1.map(n => `<span>${n}</span>`).join('') || '<span style="color:#bbb">—</span>'}</div>
          </div>
          <div class="sab-sep"></div>
          <div class="sab-row">
            <div class="sab-time">2:00 – 6:00 PM</div>
            <div class="sab-names">${s2.map(n => `<span>${n}</span>`).join('') || '<span style="color:#bbb">—</span>'}</div>
          </div>
        </div>
      </div>`}).join('')

        const dirItems = malla.directorio.map((c, i) => `
      <div class="dir-row">
        <div class="dir-num">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <div class="dir-name">${c.nombre || ''}</div>
          <div class="dir-tel">${c.celular || ''}</div>
        </div>
      </div>`).join('')

        const pvdItems = malla.pvd.map(p => `
      <div class="pvd-row">
        <div>
          <div class="pvd-dias">${p.dias || ''}</div>
          <div class="pvd-hora">${p.hora || ''}</div>
        </div>
        <div class="pvd-persona">${p.persona || ''}</div>
      </div>`).join('')

        win.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"/>
    <title>${malla.titulo}</title>
    <style>
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; box-sizing:border-box; margin:0; padding:0; }
      @page { size: A3 landscape; margin: 0; }
      @media print { html,body { width:420mm; height:297mm; } .no-print { display:none !important; } }
      body { font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; background:#fff; color:#111; width:420mm; min-height:297mm; }

      .layout { display:flex; min-height:297mm; }

      /* Banda lateral */
      .sidebar { width:12mm; background:#1a1a2e; display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0; position:relative; }
      .sidebar::after { content:''; position:absolute; top:0; left:0; width:3px; height:100%; background:#2563eb; }
      .sidebar-text { writing-mode:vertical-rl; transform:rotate(180deg); font-size:7px; font-weight:800; letter-spacing:4px; text-transform:uppercase; color:rgba(255,255,255,0.5); white-space:nowrap; }

      .content { flex:1; display:flex; flex-direction:column; padding:6mm 8mm 5mm 8mm; }

      /* Cabecera */
      .header { display:flex; align-items:center; justify-content:space-between; padding-bottom:3.5mm; margin-bottom:3.5mm; border-bottom:2px solid #111; }
      .h-titulo { font-size:21px; font-weight:900; letter-spacing:-0.5px; line-height:1; color:#111; text-transform:uppercase; }
      .h-titulo span { color:#2563eb; }
      .h-subtitulo { font-size:8px; font-weight:600; letter-spacing:3px; color:#999; text-transform:uppercase; margin-top:3px; }
      .h-badge { display:inline-block; background:#1a1a2e; color:#fff; font-size:7px; font-weight:800; letter-spacing:2px; text-transform:uppercase; padding:5px 12px; border-radius:3px; }
      .h-inst { font-size:7px; color:#bbb; letter-spacing:1px; text-transform:uppercase; text-align:right; margin-top:4px; }

      /* Grid que llena el espacio disponible */
      .main-grid { display:grid; grid-template-columns:1fr 170px; grid-template-rows:1fr auto; gap:3.5mm; flex:1; }
      .col-semana  { grid-column:1; grid-row:1; display:flex; flex-direction:column; }
      .col-sabados { grid-column:1; grid-row:2; }
      .col-right   { grid-column:2; grid-row:1/3; display:flex; flex-direction:column; gap:3mm; }

      /* Label sección */
      .sec-label { font-size:6.5px; font-weight:800; letter-spacing:3px; text-transform:uppercase; color:#bbb; margin-bottom:2mm; display:flex; align-items:center; gap:6px; }
      .sec-label::after { content:''; flex:1; height:1px; background:#ebebeb; }

      /* Tabla semana — se estira para llenar espacio */
      .semana-wrap { flex:1; display:flex; flex-direction:column; }
      .semana-table { width:100%; border-collapse:collapse; table-layout:fixed; height:100%; }
      .semana-table thead tr { border-bottom:2px solid #111; }
      .semana-table th { padding:6px; font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:1px; text-align:center; color:#fff; background:#1a1a2e; }
      .semana-table th.th-hora { text-align:left; padding-left:8px; width:100px; background:#111; color:rgba(255,255,255,0.6); }
      .semana-table tbody { height:100%; }
      .semana-table td { padding:6px; vertical-align:middle; text-align:left; border-bottom:1px solid #ebebeb; border-right:1px solid #f0f0f0; }
      .semana-table td:last-child { border-right:none; }
      .semana-table tr:last-child td { border-bottom:none; }
      .semana-table tr:nth-child(even) td { background:#fafafa; }
      .td-hora { text-align:left !important; padding-left:8px !important; font-size:7.5px !important; font-weight:700 !important; color:#fff !important; background:#2d2d2d !important; white-space:nowrap; border-right:none !important; vertical-align:middle !important; }
      .nbadge { display:block; margin:1px 0; padding:2px 6px; font-size:8px; font-weight:700; color:#1a1a2e; line-height:1.4; border-left:2px solid #2563eb; background:#eff6ff; }
      .nhora  { display:block; font-size:7px; font-weight:600; color:#2563eb; margin-top:1px; }

      /* Sábados */
      .sabs-wrap { display:flex; gap:3mm; }
      .sab-card { flex:1; border:1px solid #e5e5e5; border-radius:5px; overflow:hidden; border-top:3px solid #1a1a2e; }
      .sab-head { padding:5px 8px; font-size:7.5px; font-weight:900; letter-spacing:1.5px; text-transform:uppercase; color:#fff; background:#1a1a2e; }
      .sab-body { padding:5px 8px; }
      .sab-row  { margin-bottom:3px; }
      .sab-row:last-child { margin-bottom:0; }
      .sab-sep  { height:1px; background:#f0f0f0; margin:3px 0; }
      .sab-time { font-size:6.5px; color:#bbb; font-weight:700; margin-bottom:2px; text-transform:uppercase; letter-spacing:.5px; }
      .sab-names { display:flex; flex-direction:column; gap:1px; }
      .sab-names span { font-size:8px; font-weight:700; color:#1a1a2e; padding:1px 0; border-bottom:1px solid #f5f5f5; }
      .sab-names span:last-child { border-bottom:none; }

      /* Columna derecha */
      .right-box { border:1px solid #e5e5e5; border-radius:5px; padding:3mm; border-top:2px solid #2563eb; }
      .dir-row { display:flex; align-items:flex-start; gap:7px; padding:3.5px 0; border-bottom:1px solid #f5f5f5; }
      .dir-row:last-child { border-bottom:none; }
      .dir-num  { font-size:7.5px; font-weight:900; color:#2563eb; width:14px; flex-shrink:0; margin-top:1px; }
      .dir-name { font-size:8.5px; font-weight:700; color:#111; line-height:1.3; }
      .dir-tel  { font-size:7px; color:#999; margin-top:1px; }
      .pvd-row  { padding:3.5px 0; border-bottom:1px solid #f5f5f5; }
      .pvd-row:last-child { border-bottom:none; }
      .pvd-dias    { font-size:7px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:.5px; }
      .pvd-hora    { font-size:6.5px; color:#aaa; margin:1px 0; }
      .pvd-persona { font-size:8.5px; font-weight:700; color:#111; }

      /* Footer */
      .footer { padding-top:3mm; border-top:1px solid #ebebeb; display:flex; justify-content:space-between; align-items:center; margin-top:auto; }
      .footer-text { font-size:6.5px; color:#ccc; letter-spacing:2px; text-transform:uppercase; }
      .footer-accent { display:flex; gap:3px; align-items:center; }
      .footer-accent span { display:inline-block; height:2px; border-radius:2px; }
      .footer-accent span:nth-child(1) { width:20px; background:#2563eb; }
      .footer-accent span:nth-child(2) { width:12px; background:#1a1a2e; }
      .footer-accent span:nth-child(3) { width:6px; background:#e5e5e5; }
    </style>
    </head><body>
    <div class="layout">
      <div class="sidebar">
        <div class="sidebar-text">Alcaldía de Candelaria &nbsp;·&nbsp; Valle del Cauca &nbsp;·&nbsp; Colombia</div>
      </div>
      <div class="content">
        <div class="header">
          <div>
            <div class="h-titulo">Cronograma <span>de Turnos</span></div>
            <div class="h-subtitulo">Multicampus Universitario</div>
          </div>
          <div>
            <div class="h-badge">Vigente</div>
            <div class="h-inst" style="margin-top:4px">Alcaldía de Candelaria · Valle del Cauca</div>
          </div>
        </div>
        <div class="main-grid">
          <div class="col-semana">
            <div class="sec-label">Semana regular — Lunes a Viernes</div>
            <div class="semana-wrap">
            <table class="semana-table">
              <thead><tr>
                <th class="th-hora">Horario</th>
                ${DIAS.map(d => `<th>${d}</th>`).join('')}
              </tr></thead>
              <tbody>
                ${FRANJAS.map(f => `
                <tr>
                  <td class="td-hora">${f.label}</td>
                  ${DIAS.map(d => `<td>${celdaSemana(d, f.id)}</td>`).join('')}
                </tr>`).join('')}
              </tbody>
            </table>
            </div>
          </div>
          <div class="col-right">
            ${malla.directorio.length > 0 ? `<div class="right-box"><div class="sec-label">Directorio</div>${dirItems}</div>` : ''}
            ${malla.pvd.length > 0 ? `<div class="right-box"><div class="sec-label">Punto Vive Digital</div>${pvdItems}</div>` : ''}
          </div>
          <div class="col-sabados">
            <div class="sec-label">Sábados rotativos</div>
            <div class="sabs-wrap">${bloquesSabados}</div>
          </div>
        </div>
        <div class="footer">
          <div class="footer-text">Cronograma Oficial de Turnos · Multicampus Universitario · Candelaria Valle</div>
          <div class="footer-accent"><span></span><span></span><span></span></div>
        </div>
      </div>
    </div>
    </body></html>`)
        win.document.close()
        setTimeout(() => {
            const PX_PER_MM = 3.7795
            const PAGE_W = 420 * PX_PER_MM
            const PAGE_H = 297 * PX_PER_MM
            const layout = win.document.querySelector('.layout')
            if (layout) {
                const cw = layout.scrollWidth
                const ch = layout.scrollHeight
                const scale = Math.min(PAGE_W / cw, PAGE_H / ch)
                if (scale !== 1) {
                    win.document.body.style.margin = '0'
                    win.document.body.style.padding = '0'
                    win.document.body.style.overflow = 'hidden'
                    layout.style.transformOrigin = '0 0'
                    layout.style.transform = `scale(${scale})`
                    layout.style.width = (cw) + 'px'
                    layout.style.height = (ch) + 'px'
                    win.document.body.style.width = Math.round(cw * scale) + 'px'
                    win.document.body.style.height = Math.round(ch * scale) + 'px'
                }
            }
            win.print()
        }, 700)
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Cargando…</div>

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Malla de Turnos</h1>
                    <p className={styles.sub}>Cronograma semanal y sábados rotativos</p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {saved && <span style={{ alignSelf: 'center', color: 'green', fontSize: 13 }}>✓ Guardado</span>}
                    <button className="btn btn-secondary" onClick={imprimir}>🖨 Imprimir</button>
                    <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                        {saving ? 'Guardando…' : '💾 Guardar'}
                    </button>
                </div>
            </div>

            {/* Título */}
            <div className={`card ${styles.section}`}>
                <label className={styles.sectionLabel}>Título del cronograma</label>
                <input value={malla.titulo} onChange={e => setMalla(m => ({ ...m, titulo: e.target.value }))} style={{ fontWeight: 700, fontSize: 15 }} />
            </div>

            {/* SEMANA FIJA */}
            <div className={`card ${styles.section}`}>
                <h2 className={styles.sectionTitle}>📅 Semana Fija — Lunes a Viernes</h2>
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.mTable}>
                        <thead>
                            <tr>
                                <th className={styles.horaCol}>Horario</th>
                                {DIAS.map(d => <th key={d}>{d}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {FRANJAS.map(f => (
                                <tr key={f.id}>
                                    <td className={styles.horaCell}>{f.label}</td>
                                    {DIAS.map(dia => {
                                        const personas = normalizar(malla.semana[`${dia}_${f.id}`] || [])
                                        const usados = personas.map(p => p.nombre)
                                        return (
                                            <td key={dia} className={styles.personaCell}>
                                                <div className={styles.seleccionados}>
                                                    {personas.map(p => (
                                                        <div key={p.nombre} className={styles.personaItem}>
                                                            <div className={styles.personaTop}>
                                                                <span className={styles.personaNombre}>{p.nombre}</span>
                                                                <button className={styles.chipDel} onClick={() => quitarPersona(dia, f.id, p.nombre)}>×</button>
                                                            </div>
                                                            <div className={styles.horasRow}>
                                                                <input
                                                                    className={styles.horaInput}
                                                                    value={p.horaInicio}
                                                                    onChange={e => setHoraPersona(dia, f.id, p.nombre, 'horaInicio', e.target.value)}
                                                                    placeholder="Inicio"
                                                                />
                                                                <span className={styles.horaSep}>–</span>
                                                                <input
                                                                    className={styles.horaInput}
                                                                    value={p.horaFin}
                                                                    onChange={e => setHoraPersona(dia, f.id, p.nombre, 'horaFin', e.target.value)}
                                                                    placeholder="Fin"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <select className={styles.addSelect} value=""
                                                    onChange={e => { if (e.target.value) agregarPersona(dia, f.id, e.target.value) }}>
                                                    <option value="">+ Agregar…</option>
                                                    {colaboradores.filter(c => !usados.includes(c))
                                                        .map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SÁBADOS */}
            <div className={`card ${styles.section}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 className={styles.sectionTitle}>📆 Sábados Rotativos</h2>
                    <button className="btn btn-secondary btn-sm" onClick={agregarSabado}>＋ Sábado</button>
                </div>
                <div className={styles.sabGrid}>
                    {malla.sabados.map((sab, idx) => (
                        <div key={idx} className={styles.sabCard}>
                            <div className={styles.sabHeader}>
                                <input type="date" value={sab.fecha}
                                    onChange={e => setSabado(idx, 'fecha', e.target.value)}
                                    className={styles.sabFecha} />
                                <button className={styles.sabDel} onClick={() => eliminarSabado(idx)}>🗑</button>
                            </div>
                            {FRANJAS_SAB.map(f => {
                                const nombres = (sab[f.id] || []).map(p => typeof p === 'string' ? p : p.nombre)
                                return (
                                    <div key={f.id} className={styles.sabFranja}>
                                        <div className={styles.sabFranjaLabel}>{f.label}</div>
                                        <div className={styles.seleccionados}>
                                            {nombres.map(n => (
                                                <span key={n} className={styles.chip}>
                                                    {n}
                                                    <button onClick={() => togglePersonaSab(idx, f.id, n)}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                        <select className={styles.addSelect} value=""
                                            onChange={e => { if (e.target.value) togglePersonaSab(idx, f.id, e.target.value) }}>
                                            <option value="">+ Agregar…</option>
                                            {colaboradores.filter(c => !nombres.includes(c))
                                                .map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* DIRECTORIO */}
            <div className={`card ${styles.section}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 className={styles.sectionTitle}>📞 Directorio Telefónico</h2>
                    <button className="btn btn-secondary btn-sm" onClick={agregarContacto}>＋ Contacto</button>
                </div>
                <div className={styles.dirGrid}>
                    {malla.directorio.map((c, idx) => (
                        <div key={idx} className={styles.dirRow}>
                            <input placeholder="Nombre y apellido" value={c.nombre}
                                onChange={e => setDirectorio(idx, 'nombre', e.target.value)} />
                            <input placeholder="Celular" value={c.celular}
                                onChange={e => setDirectorio(idx, 'celular', e.target.value)} style={{ maxWidth: 150 }} />
                            <button className="btn btn-icon btn-sm"
                                style={{ background: '#fdf0ef', color: 'var(--danger)', border: '1px solid #f5c2be', flexShrink: 0 }}
                                onClick={() => eliminarContacto(idx)}>🗑</button>
                        </div>
                    ))}
                    {malla.directorio.length === 0 &&
                        <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin contactos. Agrega con el botón.</p>}
                </div>
            </div>

            {/* PUNTO VIVE DIGITAL */}
            <div className={`card ${styles.section}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 className={styles.sectionTitle}>💻 Punto Vive Digital</h2>
                    <button className="btn btn-secondary btn-sm" onClick={agregarPVD}>＋ Fila</button>
                </div>
                {malla.pvd.map((p, idx) => (
                    <div key={idx} className={styles.dirRow} style={{ marginBottom: 8 }}>
                        <input placeholder="Días (ej: Lunes a Viernes)" value={p.dias}
                            onChange={e => setPVD(idx, 'dias', e.target.value)} />
                        <input placeholder="Horario" value={p.hora}
                            onChange={e => setPVD(idx, 'hora', e.target.value)} style={{ maxWidth: 160 }} />
                        <input placeholder="Responsable" value={p.persona}
                            onChange={e => setPVD(idx, 'persona', e.target.value)} />
                        <button className="btn btn-icon btn-sm"
                            style={{ background: '#fdf0ef', color: 'var(--danger)', border: '1px solid #f5c2be', flexShrink: 0 }}
                            onClick={() => eliminarPVD(idx)}>🗑</button>
                    </div>
                ))}
            </div>
        </div>
    )
}