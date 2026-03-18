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
    const [showEnviar, setShowEnviar] = useState(false)
    const [tipoMensaje, setTipoMensaje] = useState('personalizado')
    const [mensajeGeneral, setMensajeGeneral] = useState('')

    useEffect(() => {
        supabase.from('entregadores').select('nombre').order('nombre')
            .then(({ data }) => setColaboradores((data || []).map(x => x.nombre)))
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

    function normalizar(lista) {
        return (lista || []).map(p => {
            if (typeof p === 'string') return { nombre: p, horaInicio: '', horaFin: '' }
            if (p.hora !== undefined) return { nombre: p.nombre, horaInicio: p.hora || '', horaFin: '' }
            return p
        })
    }

    function movePersona(dia, franja, nombre, dir) {
        const key = `${dia}_${franja}`
        const lista = normalizar(malla.semana[key] || [])
        const idx = lista.findIndex(p => p.nombre === nombre)
        if (idx === -1) return
        const nueva = [...lista]
        const swap = dir === 'up' ? idx - 1 : idx + 1
        if (swap < 0 || swap >= nueva.length) return
            ;[nueva[idx], nueva[swap]] = [nueva[swap], nueva[idx]]
        setSemana(dia, franja, nueva)
    }
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
    function togglePersonaSab(idx, campo, nombre) {
        const actual = (malla.sabados[idx][campo] || []).map(p => typeof p === 'string' ? p : p.nombre)
        setSabado(idx, campo, actual.includes(nombre) ? actual.filter(n => n !== nombre) : [...actual, nombre])
    }

    // WhatsApp
    function buildMensajePersonalizado(contacto) {
        const nombre = contacto.nombre
        const nombreNorm = nombre.trim().toLowerCase()
        const turnosLineas = []
        FRANJAS.forEach(f => {
            DIAS.forEach(dia => {
                const personas = normalizar(malla.semana[`${dia}_${f.id}`] || [])
                const p = personas.find(p => p.nombre.trim().toLowerCase() === nombreNorm)
                if (p) {
                    const hora = p.horaInicio && p.horaFin ? `${p.horaInicio} - ${p.horaFin}` : f.label
                    turnosLineas.push(`• ${dia}: ${hora}`)
                }
            })
        })
        const sabLineas = []
        malla.sabados.forEach(s => {
            const fmtS = f => {
                if (!f) return ''
                const [y, m, d] = f.split('-').map(Number)
                const meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                return `Sáb ${d} ${meses[m]}`
            }
            FRANJAS_SAB.forEach(f => {
                const lista = (s[f.id] || []).map(p => typeof p === 'string' ? p : p.nombre)
                if (lista.some(n => n.trim().toLowerCase() === nombreNorm))
                    sabLineas.push(`• ${fmtS(s.fecha)}: ${f.label}`)
            })
        })
        let msg = `🗓 *${malla.titulo}*\n📍 Alcaldía de Candelaria — Multicampus\n\nHola *${nombre}*, este es tu cronograma:\n\n`
        if (turnosLineas.length > 0) msg += `*Semana regular (L-V):*\n${turnosLineas.join('\n')}\n\n`
        if (sabLineas.length > 0) msg += `*Sábados asignados:*\n${sabLineas.join('\n')}\n\n`
        if (!turnosLineas.length && !sabLineas.length) msg += `_(Sin turnos asignados aún)_\n\n`
        msg += `_Cualquier duda comunícate con el coordinador._\n\n`
        msg += `🔗 Ver cronograma completo: https://sistema-entregas-two.vercel.app/cronograma`
        return msg
    }

    function buildMensajeGeneral(contacto) {
        const base = mensajeGeneral.trim() ||
            `🗓 *${malla.titulo}*\n📍 Alcaldía de Candelaria — Multicampus\n\nHola *{nombre}*, te compartimos el cronograma de turnos vigente.\n\nCualquier duda comunícate con el coordinador.\n\n🔗 Ver cronograma: https://sistema-entregas-two.vercel.app/cronograma`
        return base.replace(/\{nombre\}/gi, contacto.nombre)
    }

    function abrirWhatsApp(contacto) {
        const numero = (contacto.celular || '').replace(/\D/g, '')
        if (!numero) return alert(`${contacto.nombre} no tiene número registrado.`)
        const numCO = numero.startsWith('57') ? numero : `57${numero}`
        const msg = tipoMensaje === 'personalizado'
            ? buildMensajePersonalizado(contacto)
            : buildMensajeGeneral(contacto)
        window.open(`https://wa.me/${numCO}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    function enviarATodos() {
        const contactos = malla.directorio.filter(c => c.celular)
        if (!contactos.length) return alert('No hay contactos con número registrado.')
        contactos.forEach((c, i) => setTimeout(() => abrirWhatsApp(c), i * 800))
    }

    function imprimir() {
        const win = window.open('', '_blank', 'width=1400,height=1000')

        const fmtFecha = f => {
            if (!f) return ''
            const [y, m, d] = f.split('-').map(Number)
            const meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
            return `Sáb ${d} ${meses[m]}`
        }

        const celdaSemana = (dia, franja) => {
            const personas = normalizar(malla.semana[`${dia}_${franja}`] || [])
            if (!personas.length) return '<span style="color:#bbb">—</span>'
            return personas.map(p => {
                const h = p.horaInicio && p.horaFin ? `${p.horaInicio} – ${p.horaFin}` : ''
                return `<div style="font-weight:700;font-size:9.5px;padding:3px 0;border-bottom:1px solid #eee">${p.nombre}${h ? `<div style="font-size:8px;color:#555;font-weight:600;margin-top:1px">${h}</div>` : ''}</div>`
            }).join('')
        }

        const diasHeaders = DIAS.map(d => `<th>${d.toUpperCase()}</th>`).join('')
        const franjaRows = FRANJAS.map((f, fi) =>
            `<tr style="background:${fi % 2 === 0 ? '#f5f5f5' : '#fff'}">
        <td style="background:#d9d9d9;font-weight:800;font-size:9px;text-align:center;padding:10px 6px;border:1px solid #999;white-space:nowrap">${f.label}</td>
        ${DIAS.map(d => `<td style="padding:8px;border:1px solid #ccc;vertical-align:top">${celdaSemana(d, f.id)}</td>`).join('')}
      </tr>`
        ).join('')

        const sabRows = malla.sabados.map((s, i) => {
            const s1 = (s.s1 || []).map(p => typeof p === 'string' ? p : p.nombre)
            const s2 = (s.s2 || []).map(p => typeof p === 'string' ? p : p.nombre)
            return `<tr style="background:${i % 2 === 0 ? '#f5f5f5' : '#fff'}">
        <td style="font-weight:800;font-size:9px;padding:7px 8px;border:1px solid #ccc">${fmtFecha(s.fecha)}</td>
        <td style="padding:7px 8px;border:1px solid #ccc;font-size:9.5px">${s1.map(n => `<div style="font-weight:700">${n}</div>`).join('') || '<span style="color:#bbb">—</span>'}</td>
        <td style="padding:7px 8px;border:1px solid #ccc;font-size:9.5px">${s2.map(n => `<div style="font-weight:700">${n}</div>`).join('') || '<span style="color:#bbb">—</span>'}</td>
      </tr>`
        }).join('')

        const dirRows = malla.directorio.map((c, i) =>
            `<tr style="background:${i % 2 === 0 ? '#f5f5f5' : '#fff'}">
        <td style="padding:6px 8px;border:1px solid #ccc;font-weight:700;font-size:9.5px">${c.nombre || ''}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;font-size:9.5px">${c.celular || ''}</td>
      </tr>`
        ).join('')

        const pvdRows = malla.pvd.map((p, i) =>
            `<tr style="background:${i % 2 === 0 ? '#f5f5f5' : '#fff'}">
        <td style="padding:6px 8px;border:1px solid #ccc;font-weight:700;font-size:9px">${p.dias || ''}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;font-size:9px">${p.hora || ''}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;font-weight:700;font-size:9.5px">${p.persona || ''}</td>
      </tr>`
        ).join('')

        const hasSab = malla.sabados.length > 0
        const hasDir = malla.directorio.length > 0
        const hasPvd = malla.pvd.length > 0

        const html = `<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"/><title>${malla.titulo}</title>
    <style>
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; box-sizing:border-box; margin:0; padding:0; }
      @page { size: A3 landscape; margin: 8mm; }
      body { font-family:Arial,sans-serif; font-size:10px; color:#000; background:#fff; }
      .header-box { border:1.5px solid #000; display:flex; align-items:stretch; }
      .header-logo { width:85px; min-height:75px; border-right:1.5px solid #000; display:flex; align-items:center; justify-content:center; padding:5px; flex-shrink:0; }
      .header-logo img { max-width:72px; max-height:66px; object-fit:contain; }
      .header-titles { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:8px 20px; }
      .header-org { font-size:12px; font-weight:700; text-align:center; }
      .header-doc { font-size:14px; font-weight:900; text-align:center; margin-top:4px; text-transform:uppercase; letter-spacing:0.5px; }
      .info-row { display:flex; border:1.5px solid #000; border-top:none; margin-bottom:8px; }
      .info-cell { padding:5px 10px; font-size:10px; display:flex; align-items:center; gap:6px; }
      .info-cell.label { background:#d9d9d9; font-weight:700; flex-shrink:0; font-size:9px; text-transform:uppercase; }
      .info-cell.value { flex:1; border-right:1px solid #ccc; }
      .info-cell.value:last-child { border-right:none; }
      .sec-title { background:#d9d9d9; font-weight:800; font-size:9px; text-transform:uppercase; padding:5px 8px; border:1.5px solid #000; border-bottom:none; letter-spacing:0.5px; }
      .semana-table { width:100%; border-collapse:collapse; border:1.5px solid #000; margin-bottom:8px; table-layout:fixed; }
      .semana-table th { background:#d9d9d9; font-weight:800; font-size:9px; text-transform:uppercase; padding:6px 4px; text-align:center; border:1px solid #999; }
      .semana-table th.th-hora { width:110px; }
      .bottom-grid { display:grid; gap:8px; margin-bottom:8px; }
      .sub-table { width:100%; border-collapse:collapse; border:1.5px solid #000; }
      .sub-table th { background:#d9d9d9; font-weight:700; font-size:8.5px; text-transform:uppercase; padding:5px 6px; text-align:center; border:1px solid #999; }
      .footer { border-top:1.5px solid #000; padding-top:5px; display:flex; justify-content:space-between; align-items:center; margin-top:6px; }
      .footer-text { font-size:8px; color:#555; letter-spacing:1px; text-transform:uppercase; }
      .footer-right { font-size:8px; color:#555; }
    </style>
    </head><body>

    <div class="header-box">
      <div class="header-logo">
        <img src="${window.location.origin}/logo_candelaria.png" alt="Logo" onerror="this.style.display='none'" />
      </div>
      <div class="header-titles">
        <div class="header-org">ALCALDÍA DE CANDELARIA — VALLE DEL CAUCA, COLOMBIA</div>
        <div class="header-doc">${malla.titulo}</div>
      </div>
    </div>
    <div class="info-row">
      <div class="info-cell label">Subprograma</div>
      <div class="info-cell value">Accesos a la Educación Superior — Candelaria Valle del Cauca</div>
      <div class="info-cell label">Estado</div>
      <div class="info-cell value" style="font-weight:700">VIGENTE</div>
    </div>

    <div class="sec-title">Semana Regular — Lunes a Viernes</div>
    <table class="semana-table">
      <thead><tr>
        <th class="th-hora">HORARIO</th>
        ${diasHeaders}
      </tr></thead>
      <tbody>${franjaRows}</tbody>
    </table>

    ${hasSab || hasDir || hasPvd ? `
    <div class="bottom-grid" style="grid-template-columns:${hasSab && (hasDir || hasPvd) ? '1fr 1fr' : hasSab ? '1fr' : '1fr'}">
      ${hasSab ? `
      <div>
        <div class="sec-title">Sábados Rotativos</div>
        <table class="sub-table">
          <thead><tr>
            <th style="width:90px">FECHA</th>
            <th>8:00 AM – 12:45 PM</th>
            <th>2:00 PM – 6:00 PM</th>
          </tr></thead>
          <tbody>${sabRows}</tbody>
        </table>
      </div>` : ''}
      ${hasDir || hasPvd ? `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${hasDir ? `
        <div>
          <div class="sec-title">Directorio Telefónico</div>
          <table class="sub-table">
            <thead><tr><th>NOMBRE Y APELLIDO</th><th style="width:120px">CELULAR</th></tr></thead>
            <tbody>${dirRows}</tbody>
          </table>
        </div>` : ''}
        ${hasPvd ? `
        <div>
          <div class="sec-title">Punto Vive Digital</div>
          <table class="sub-table">
            <thead><tr><th>DÍAS</th><th>HORARIO</th><th>RESPONSABLE</th></tr></thead>
            <tbody>${pvdRows}</tbody>
          </table>
        </div>` : ''}
      </div>` : ''}
    </div>` : ''}

    <div class="footer">
      <div class="footer-text">Alcaldía Municipal de Candelaria · Valle del Cauca · Cronograma Oficial de Turnos</div>
      <div class="footer-right">Multicampus Universitario</div>
    </div>
    </body></html>`

        win.document.write(html)
        win.document.close()
        setTimeout(() => win.print(), 500)
    }


    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Cargando…</div>

    const WaIcon = () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    )

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Malla de Turnos</h1>
                    <p className={styles.sub}>Cronograma semanal y sábados rotativos</p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {saved && <span style={{ alignSelf: 'center', color: 'green', fontSize: 13 }}>✓ Guardado</span>}
                    <button className="btn btn-secondary" onClick={() => setShowEnviar(v => !v)}>💬 WhatsApp</button>
                    <button className="btn btn-secondary" onClick={imprimir}>🖨 Imprimir</button>
                    <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                        {saving ? 'Guardando…' : '💾 Guardar'}
                    </button>
                </div>
            </div>

            {/* Panel WhatsApp */}
            {showEnviar && (
                <div className={`card ${styles.section}`}>
                    <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>💬 Enviar cronograma por WhatsApp</h2>
                    <div className={styles.tipoRow}>
                        <button className={`${styles.tipoBtn} ${tipoMensaje === 'personalizado' ? styles.tipoBtnActive : ''}`}
                            onClick={() => setTipoMensaje('personalizado')}>
                            👤 Personalizado (con su horario)
                        </button>
                        <button className={`${styles.tipoBtn} ${tipoMensaje === 'general' ? styles.tipoBtnActive : ''}`}
                            onClick={() => setTipoMensaje('general')}>
                            📢 General (mismo para todos)
                        </button>
                    </div>
                    {tipoMensaje === 'general' && (
                        <div className={styles.field} style={{ margin: '12px 0' }}>
                            <label className={styles.sectionLabel}>
                                Mensaje — usa <code style={{ background: '#f0f0f0', padding: '1px 5px', borderRadius: 3 }}>{'{nombre}'}</code> para el nombre de cada persona
                            </label>
                            <textarea rows={4} value={mensajeGeneral} onChange={e => setMensajeGeneral(e.target.value)}
                                placeholder={`Hola {nombre}, este es el cronograma vigente...`} />
                        </div>
                    )}
                    {malla.directorio.length === 0 ? (
                        <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 12 }}>
                            Sin contactos en el directorio. Agrégalos en la sección Directorio Telefónico.
                        </p>
                    ) : (
                        <>
                            <div style={{ margin: '12px 0' }}>
                                <button onClick={enviarATodos}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                                    <WaIcon /> Enviar a todos ({malla.directorio.filter(c => c.celular).length} contactos)
                                </button>
                                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                                    Se abrirá WhatsApp para cada contacto. Permite ventanas emergentes si el navegador las bloquea.
                                </p>
                            </div>
                            <div className={styles.waGrid}>
                                {malla.directorio.map((c, i) => (
                                    <div key={i} className={styles.waCard}>
                                        <div className={styles.waAvatar}>{(c.nombre || '?').charAt(0).toUpperCase()}</div>
                                        <div className={styles.waInfo}>
                                            <div className={styles.waNombre}>{c.nombre || 'Sin nombre'}</div>
                                            <div className={styles.waCelular}>{c.celular || '⚠ Sin número'}</div>
                                        </div>
                                        <button className={styles.waBtn} onClick={() => abrirWhatsApp(c)} disabled={!c.celular}>
                                            <WaIcon /> Enviar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

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
                                                    {personas.map((p, pi) => (
                                                        <div key={p.nombre} className={styles.personaItem}>
                                                            <div className={styles.personaTop}>
                                                                <span className={styles.personaNombre}>{p.nombre}</span>
                                                                <div className={styles.personaActions}>
                                                                    <button className={styles.moveBtn} onClick={() => movePersona(dia, f.id, p.nombre, 'up')} disabled={pi === 0}>↑</button>
                                                                    <button className={styles.moveBtn} onClick={() => movePersona(dia, f.id, p.nombre, 'down')} disabled={pi === personas.length - 1}>↓</button>
                                                                    <button className={styles.chipDel} onClick={() => quitarPersona(dia, f.id, p.nombre)}>×</button>
                                                                </div>
                                                            </div>
                                                            <div className={styles.horasRow}>
                                                                <input className={styles.horaInput} value={p.horaInicio}
                                                                    onChange={e => setHoraPersona(dia, f.id, p.nombre, 'horaInicio', e.target.value)}
                                                                    placeholder="Inicio" />
                                                                <span className={styles.horaSep}>–</span>
                                                                <input className={styles.horaInput} value={p.horaFin}
                                                                    onChange={e => setHoraPersona(dia, f.id, p.nombre, 'horaFin', e.target.value)}
                                                                    placeholder="Fin" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <select className={styles.addSelect} value=""
                                                    onChange={e => { if (e.target.value) agregarPersona(dia, f.id, e.target.value) }}>
                                                    <option value="">+ Agregar…</option>
                                                    {colaboradores.filter(c => !usados.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
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
                                    onChange={e => setSabado(idx, 'fecha', e.target.value)} className={styles.sabFecha} />
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
                                            {colaboradores.filter(c => !nombres.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
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
                            <select value={c.nombre} onChange={e => setDirectorio(idx, 'nombre', e.target.value)}
                                style={{ flex: 1 }}>
                                <option value="">Seleccionar persona…</option>
                                {colaboradores.map(n => <option key={n} value={n}>{n}</option>)}
                                {c.nombre && !colaboradores.includes(c.nombre) &&
                                    <option value={c.nombre}>{c.nombre}</option>}
                            </select>
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