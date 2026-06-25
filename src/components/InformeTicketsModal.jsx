import { useState, useEffect } from 'react'
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const VERDE  = [20, 83, 45]
const VERDE2 = [21, 128, 61]
const ORO    = [202, 138, 4]
const C      = { si: '#16a34a', no: '#dc2626', azul: '#0284c7', naranja: '#f59e0b', verde: '#15803d' }

const fmtCOP = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)

const fmtFecha = (f) => {
    if (!f) return ''
    const [y, m, d] = f.split('-')
    return `${d}/${m}/${y}`
}

const genTimestamp = () => {
    const now = new Date()
    return `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}  ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
}

// ── Festivos Colombia ────────────────────────────────────────────
function toStr(y, m, d) {
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function easterDate(year) {
    const a = year % 19, b = Math.floor(year/100), c = year % 100
    const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25)
    const g = Math.floor((b-f+1)/3)
    const h = (19*a + b - d - g + 15) % 30
    const i = Math.floor(c/4), k = c % 4
    const l = (32 + 2*e + 2*i - h - k) % 7
    const m2 = Math.floor((a + 11*h + 22*l) / 451)
    const month = Math.floor((h + l - 7*m2 + 114) / 31)
    const day   = ((h + l - 7*m2 + 114) % 31) + 1
    return new Date(year, month - 1, day)
}

function offsetDays(date, n) {
    const d = new Date(date); d.setDate(d.getDate() + n); return d
}

function nextMonday(date) {
    const d = new Date(date), dow = d.getDay()
    if (dow === 1) return d
    d.setDate(d.getDate() + (dow === 0 ? 1 : 8 - dow))
    return d
}

function festivosColombia(year) {
    const f = new Set()
    const add = (d) => f.add(toStr(d.getFullYear(), d.getMonth()+1, d.getDate()))
    const nm  = (d) => nextMonday(d)

    // Fijos
    add(new Date(year,  0,  1))   // Año Nuevo
    add(new Date(year,  4,  1))   // Día del Trabajo
    add(new Date(year,  6, 20))   // Independencia
    add(new Date(year,  7,  7))   // Batalla de Boyacá
    add(new Date(year, 11,  8))   // Inmaculada Concepción
    add(new Date(year, 11, 25))   // Navidad

    // Trasladables al lunes siguiente
    add(nm(new Date(year,  0,  6)))  // Reyes Magos
    add(nm(new Date(year,  2, 19)))  // San José
    add(nm(new Date(year,  5, 29)))  // San Pedro y San Pablo
    add(nm(new Date(year,  7, 15)))  // Asunción
    add(nm(new Date(year,  9, 12)))  // Día de la Raza
    add(nm(new Date(year, 10,  1)))  // Todos los Santos
    add(nm(new Date(year, 10, 11)))  // Independencia de Cartagena

    // Semana Santa y móviles basados en Pascua
    const pascua = easterDate(year)
    add(offsetDays(pascua, -3))           // Jueves Santo
    add(offsetDays(pascua, -2))           // Viernes Santo
    add(nm(offsetDays(pascua,  39)))      // Ascensión del Señor
    add(nm(offsetDays(pascua,  60)))      // Corpus Christi
    add(nm(offsetDays(pascua,  68)))      // Sagrado Corazón de Jesús

    return f
}

// ── Cálculo de tickets ───────────────────────────────────────────
// 1 ticket = 1 día de viaje activo en el mes, excluyendo festivos.
function calcTickets(item, mes) {
    if (!mes) return 0
    const [y, m] = mes.split('-').map(Number)
    const diasEnMes = new Date(y, m, 0).getDate()
    const mapaFld   = { 1:'dia_lunes', 2:'dia_martes', 3:'dia_miercoles', 4:'dia_jueves', 5:'dia_viernes', 6:'dia_sabado' }
    const festivos  = festivosColombia(y)
    let viajes = 0
    for (let d = 1; d <= diasEnMes; d++) {
        const fechaStr = toStr(y, m, d)
        if (festivos.has(fechaStr)) continue
        const dow = new Date(y, m - 1, d).getDay()
        if (mapaFld[dow] && item[mapaFld[dow]]) viajes++
    }
    return viajes
}

const TooltipPie = ({ active, payload, total }) => {
    if (!active || !payload?.length) return null
    const { name, value } = payload[0]
    return (
        <div style={{ background: 'white', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <strong>{name}</strong>: {value} ({total > 0 ? Math.round(value / total * 100) : 0}%)
        </div>
    )
}

const TooltipBar = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: 'white', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '11px', color: '#334155' }}>{label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ margin: '2px 0', color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
            ))}
        </div>
    )
}

const StatCard = ({ label, value, color, sub }) => (
    <div style={{ flex: 1, minWidth: '110px', padding: '14px 16px', borderRadius: '12px', background: color + '18', border: `1.5px solid ${color}35`, textAlign: 'center' }}>
        <div style={{ fontSize: '26px', fontWeight: '800', color }}>{value}</div>
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', marginTop: '4px' }}>{label}</div>
        {sub && <div style={{ fontSize: '10px', color, marginTop: '2px' }}>{sub}</div>}
    </div>
)

const Card = ({ children, style = {} }) => (
    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', ...style }}>
        {children}
    </div>
)

const SectionTitle = ({ children, right }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#334155' }}>{children}</h3>
        {right}
    </div>
)

async function cargarLogoBase64() {
    try {
        const blob = await fetch('/logo_candelaria.png').then(r => r.blob())
        return await new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.readAsDataURL(blob)
        })
    } catch { return null }
}

function agregarCabeceraPDF(doc, logoBase64, titulo, linea2, linea3) {
    const LOGO_W = 54, HEADER_H = 61
    doc.setFillColor(255,255,255); doc.rect(0, 0, LOGO_W, HEADER_H, 'F')
    doc.setFillColor(...VERDE);    doc.rect(LOGO_W, 0, 210-LOGO_W, HEADER_H, 'F')
    doc.setFillColor(...ORO);      doc.rect(LOGO_W, 0, 2, HEADER_H, 'F')
    doc.setFillColor(...ORO);      doc.rect(0, HEADER_H, 210, 2.5, 'F')
    if (logoBase64) doc.addImage(logoBase64, 'PNG', 6, 7, 42, 46)
    const tx = LOGO_W + 6
    doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont(undefined,'bold')
    doc.text('ALCALDÍA MUNICIPAL DE CANDELARIA', tx, 16)
    doc.setFontSize(9.5); doc.setFont(undefined,'normal'); doc.setTextColor(200,230,210)
    doc.text('Valle del Cauca  ·  República de Colombia', tx, 23)
    doc.setDrawColor(...ORO); doc.setLineWidth(0.55); doc.line(tx, 27, 205, 27)
    doc.setTextColor(255,255,255); doc.setFontSize(12.5); doc.setFont(undefined,'bold')
    doc.text(titulo, tx, 35)
    doc.setFontSize(9); doc.setFont(undefined,'normal'); doc.setTextColor(220,252,231)
    if (linea2) doc.text(linea2, tx, 44)
    if (linea3) doc.text(linea3, tx, 51)
    doc.text(`Generado el: ${genTimestamp()}`, tx, 57)
    doc.setTextColor(0,0,0)
    return HEADER_H + 9
}

function agregarPiePaginas(doc) {
    const total = doc.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
        doc.setPage(i)
        const h = doc.internal.pageSize.getHeight()
        doc.setFillColor(...VERDE); doc.rect(0, h-12, 210, 12, 'F')
        doc.setFillColor(...ORO);   doc.rect(0, h-13, 210, 1, 'F')
        doc.setFontSize(7.5); doc.setFont(undefined,'normal'); doc.setTextColor(200,230,200)
        doc.text('Alcaldía Municipal de Candelaria — Valle del Cauca  ·  Documento generado automáticamente', 14, h-5)
        doc.text(`Página ${i} de ${total}`, 196, h-5, { align: 'right' })
    }
}

function agregarTituloSeccion(doc, y, texto, colorFondo = [...VERDE]) {
    doc.setFillColor(...colorFondo); doc.rect(14, y, 182, 9, 'F')
    doc.setFillColor(...ORO);        doc.rect(14, y+9, 182, 1.5, 'F')
    doc.setTextColor(255,255,255); doc.setFontSize(10); doc.setFont(undefined,'bold')
    doc.text(texto, 17, y+6.5)
    doc.setTextColor(0,0,0)
    return y + 14
}

export default function InformeTicketsModal({ data, ticketData, mesAnio, fechaDistribucion, getMesLabel, onClose, supabase }) {
    const [rawHistorico, setRawHistorico]             = useState([])
    const [cargando, setCargando]                     = useState(true)
    const [mesesSeleccionados, setMesesSeleccionados] = useState(new Set())
    const [registrosExcluidos, setRegistrosExcluidos] = useState(new Set())
    const [filtroTabla, setFiltroTabla]               = useState('TODOS')
    const [busqueda, setBusqueda]                     = useState('')
    const [exportandoCompleto, setExportandoCompleto] = useState(false)
    const [dataHistorica, setDataHistorica]           = useState([])
    const [cargandoSnap, setCargandoSnap]             = useState(false)
    // mesVista controla TODO en el modal: stats, gráficas, tabla y PDF "mes"
    const [mesVista, setMesVista]                     = useState(mesAnio)

    useEffect(() => { cargarHistorico() }, [mesAnio])
    useEffect(() => {
        if (mesVista !== mesAnio) cargarSnapshotMes(mesVista)
        else setDataHistorica([])
    }, [mesVista])

    async function cargarSnapshotMes(mes) {
        setCargandoSnap(true)
        const { data: snap } = await supabase
            .from('beneficiarios_mes')
            .select('*')
            .eq('mes_anio', mes)
        setDataHistorica(snap || [])
        setCargandoSnap(false)
    }

    async function cargarHistorico() {
        setCargando(true)
        const { data: records } = await supabase.from('ticket_recojos').select('cedula, mes_anio, recogio')
        if (records) {
            setRawHistorico(records)
            const mesSet = new Set()
            records.forEach(r => { if (r.recogio === false) mesSet.add(r.mes_anio) })
            setMesesSeleccionados(mesSet)
        }
        setCargando(false)
    }

    const toggleMes      = (mes)    => setMesesSeleccionados(prev => { const n = new Set(prev); n.has(mes) ? n.delete(mes) : n.add(mes); return n })
    const toggleRegistro = (cedula) => setRegistrosExcluidos(prev  => { const n = new Set(prev); n.has(cedula) ? n.delete(cedula) : n.add(cedula); return n })

    // ── Revisado del mes actual (solo para mostrar alertas del mes real) ──
    const revisadoMesActual = Object.keys(ticketData).length > 0
    const totalExcluidos    = registrosExcluidos.size

    // Datos del mes visto: snapshot histórico cuando existe, datos live para el mes actual
    const dataActiva = mesVista === mesAnio
        ? data
        : (dataHistorica.length > 0 ? dataHistorica : data)

    // ── Listas base: completas para la tabla de selección ─────────
    // Siempre usan ticketData del mes actual para los controles de la tabla
    const noRecogieronListActual = data.filter(d => ticketData[d.cedula] === false)
    const siRecogieronListActual = data.filter(d => ticketData[d.cedula] !== false)

    // ── Incluidos (excluidos descartados de TODO) ─────────────────
    const listaIncluida = dataActiva.filter(d => !registrosExcluidos.has(d.cedula))
    const total         = listaIncluida.length

    // ── ticketData del mes VISTO (puede ser histórico) ────────────
    const tdVista = mesVista === mesAnio
        ? ticketData
        : Object.fromEntries(
            rawHistorico
                .filter(r => r.mes_anio === mesVista && r.recogio === false)
                .map(r => [r.cedula, false])
          )
    const revisadoVista     = mesVista === mesAnio
        ? revisadoMesActual
        : rawHistorico.some(r => r.mes_anio === mesVista)
    const noRecogieronVista = listaIncluida.filter(d => tdVista[d.cedula] === false)
    const siRecogieronVista = listaIncluida.filter(d => tdVista[d.cedula] !== false)
    const siCountVista      = revisadoVista ? siRecogieronVista.length : 0
    const pctVista          = revisadoVista && total > 0 ? Math.round(siCountVista / total * 100) : 0

    // Tickets del mes VISTO (1 ticket = 1 día de viaje activo, sin festivos)
    const ticketsNoRecVista = noRecogieronVista.reduce((s, item) => s + calcTickets(item, mesVista), 0)
    const ticketsTotalVista = listaIncluida.reduce((s, item) => s + calcTickets(item, mesVista), 0)

    // Valor del ticket por registro (ida + regreso, ya guardados en el registro)
    const parsePrecio = (v) => {
        if (!v) return 0
        // Formato colombiano: "3.500" → 3500, "4600" → 4600
        const s = String(v).trim().replace(/\./g, '').replace(',', '.')
        return Math.round(Number(s)) || 0
    }
    const getPrecioItem = (item) => parsePrecio(item.valor_ida) + parsePrecio(item.valor_regreso)
    const hayPrecios    = dataActiva.some(item => item.valor_ida || item.valor_regreso)

    // Valores en COP (cada item usa valor_ida + valor_regreso del propio registro)
    const valorTotalVista = listaIncluida.reduce((s, item) => s + calcTickets(item, mesVista) * getPrecioItem(item), 0)
    const valorNoRecVista = noRecogieronVista.reduce((s, item) => s + calcTickets(item, mesVista) * getPrecioItem(item), 0)

    // ── Histórico derivado (rawHistorico + exclusiones) ────────────
    const _byMes = {}
    rawHistorico.forEach(r => {
        if (registrosExcluidos.has(r.cedula)) return
        if (!_byMes[r.mes_anio]) _byMes[r.mes_anio] = { no: 0 }
        if (r.recogio === false) _byMes[r.mes_anio].no++
    })
    const historico = Object.entries(_byMes)
        .filter(([, v]) => v.no > 0)
        .map(([mes, v]) => ({
            mes, label: getMesLabel(mes),
            noRecogieron: v.no,
            siRecogieron: Math.max(0, total - v.no),
            pct: total > 0 ? Math.round((total - v.no) / total * 100) : 0
        }))
        .sort((a, b) => a.mes.localeCompare(b.mes))

    const historicoFiltrado = historico.filter(h => mesesSeleccionados.has(h.mes))

    // Meses disponibles en el selector (actual + todos con registros)
    const mesesDisponibles = [
        { mes: mesAnio, label: getMesLabel(mesAnio) + ' (actual)' },
        ...historico.filter(h => h.mes !== mesAnio).map(h => ({ mes: h.mes, label: h.label }))
    ]

    // ── Tabla del modal: TODOS para poder marcar inclusión ─────────
    // Filtros de tab usan el mes VISTO para que la vista sea coherente
    const noRecogieronListVista = dataActiva.filter(d => tdVista[d.cedula] === false)
    const siRecogieronListVista = dataActiva.filter(d => tdVista[d.cedula] !== false)

    const datosTablaBase = filtroTabla === 'NO_RECOGIERON'
        ? noRecogieronListVista
        : filtroTabla === 'SI_RECOGIERON'
            ? siRecogieronListVista
            : dataActiva
    const datosTabla = busqueda.trim()
        ? datosTablaBase.filter(d =>
            d.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
            d.cedula.includes(busqueda))
        : datosTablaBase

    // Gráficas del mes VISTO
    const pieData = [
        { name: 'Sí recogieron', value: siCountVista, color: C.si },
        { name: 'No recogieron', value: noRecogieronVista.length, color: C.no },
    ]

    const byUniv = {}
    listaIncluida.forEach(item => {
        const key = (item.universidad || 'Sin especificar').split(' - ')[0].trim().slice(0, 24)
        if (!byUniv[key]) byUniv[key] = { si: 0, no: 0 }
        if (tdVista[item.cedula] === false) byUniv[key].no++; else byUniv[key].si++
    })
    const univData = Object.entries(byUniv)
        .map(([name, v]) => ({ name, ...v, total: v.si + v.no }))
        .sort((a, b) => b.total - a.total).slice(0, 10)

    const byDest = {}
    listaIncluida.forEach(item => {
        const key = item.destino || 'Sin destino'
        if (!byDest[key]) byDest[key] = { si: 0, no: 0 }
        if (tdVista[item.cedula] === false) byDest[key].no++; else byDest[key].si++
    })
    const destData = Object.entries(byDest)
        .map(([name, v]) => ({ name, ...v }))
        .filter(d => d.si + d.no > 0)
        .sort((a, b) => (b.si + b.no) - (a.si + a.no))

    // ── Bloques PDF ───────────────────────────────────────────────
    function buildResumenTable(doc, startY, tot, siR, noR, porcentaje, tksNoR, tksTot, rev, valTot, valNoR) {
        const valorTot = hayPrecios && valTot > 0 ? fmtCOP(valTot) : '—'
        const valorNoR = hayPrecios && rev && valNoR > 0 ? fmtCOP(valNoR) : (hayPrecios ? '$ 0' : '—')
        autoTable(doc, {
            startY,
            head: [['INDICADOR', 'VALOR', 'INDICADOR', 'VALOR']],
            body: [
                [
                    'Total Beneficiarios',
                    { content: tot, styles: { fontStyle:'bold', fontSize:12, textColor:[...VERDE] } },
                    'Sí Recogieron',
                    { content: rev ? siR : '—', styles: { fontStyle:'bold', fontSize:12, textColor:[22,163,74] } }
                ],
                [
                    'No Recogieron',
                    { content: rev ? noR : '—', styles: { fontStyle:'bold', fontSize:12, textColor: rev && noR > 0 ? [185,28,28] : [100,100,100] } },
                    '% Asistencia',
                    { content: rev ? `${porcentaje}%` : 'Pendiente', styles: { fontStyle:'bold', fontSize:12, textColor: rev ? (porcentaje>=85?[22,163,74]:porcentaje>=60?[161,98,7]:[185,28,28]) : [161,98,7] } }
                ],
                [
                    'Total Tickets del mes',
                    { content: tksTot, styles: { fontStyle:'bold', fontSize:11, textColor:[88,28,135] } },
                    'Tickets no recogidos',
                    { content: rev ? tksNoR : '—', styles: { fontStyle:'bold', fontSize:11, textColor: rev && tksNoR>0?[185,28,28]:[100,100,100] } }
                ],
                [
                    'Valor total tickets (COP)',
                    { content: valorTot, styles: { fontStyle:'bold', fontSize:10, textColor: precioTicket>0?[13,148,136]:[100,100,100] } },
                    'Valor no recogidos (COP)',
                    { content: valorNoR, styles: { fontStyle:'bold', fontSize:10, textColor: precioTicket>0&&rev&&tksNoR>0?[185,28,28]:[100,100,100] } }
                ],
            ],
            headStyles: { fillColor:[...VERDE], textColor:[255,255,255], fontSize:8, fontStyle:'bold', halign:'center' },
            bodyStyles: { halign:'center', fontSize:9, cellPadding:5 },
            columnStyles: {
                0: { halign:'left', fontStyle:'bold', textColor:[71,85,105], fillColor:[248,250,252] },
                2: { halign:'left', fontStyle:'bold', textColor:[71,85,105], fillColor:[248,250,252] },
            },
            margin: { left:14, right:14 },
        })
        return doc.lastAutoTable.finalY + 10
    }

    function buildListaCompleta(doc, y, lista, td, rev, mes) {
        if (lista.length === 0) return y
        if (y > 210) { doc.addPage(); y = 14 }
        y = agregarTituloSeccion(doc, y, `REGISTRO DE BENEFICIARIOS — ${lista.length} persona${lista.length!==1?'s':''}`)
        autoTable(doc, {
            startY: y,
            head: [['#','Nombre Completo','Cédula','Universidad / Institución','Destino','SISBEN','Tickets','Estado']],
            body: lista.map((item, i) => {
                const noVino = td[item.cedula] === false
                const tks    = calcTickets(item, mes)
                return [
                    i+1, item.nombre_completo, item.cedula,
                    item.universidad || '—',
                    item.destino || item.ruta || '—',
                    item.sisben || '—',
                    { content: tks, styles: { halign:'center', fontStyle:'bold', textColor: noVino?[185,28,28]:[88,28,135] } },
                    { content: noVino ? 'NO RECOGIÓ' : (rev?'SÍ RECOGIÓ':'SIN DATO'),
                      styles: { fontStyle:'bold', textColor: noVino?[185,28,28]:(rev?[22,163,74]:[100,100,100]) } }
                ]
            }),
            headStyles: { fillColor:[...VERDE2], textColor:[255,255,255], fontSize:8, fontStyle:'bold' },
            bodyStyles: { fontSize:8, cellPadding:2.5 },
            alternateRowStyles: { fillColor:[240,253,244] },
            columnStyles: { 0:{halign:'center',cellWidth:8}, 2:{font:'courier',fontSize:7.5}, 6:{halign:'center',cellWidth:16}, 7:{halign:'center',cellWidth:22} },
            margin: { left:14, right:14 },
        })
        return doc.lastAutoTable.finalY + 12
    }

    function buildNoRecogieronDetalle(doc, y, lista, mes, rev) {
        if (!rev || lista.length === 0) return y
        const totalTks = lista.reduce((s, item) => s + calcTickets(item, mes), 0)
        if (y > 230) { doc.addPage(); y = 14 }
        y = agregarTituloSeccion(doc, y,
            `ESTUDIANTES QUE NO RECOGIERON — ${lista.length} personas  ·  ${totalTks} tickets`, [185,28,28])
        autoTable(doc, {
            startY: y,
            head: [['#','Nombre Completo','Cédula','Universidad / Institución','Destino','SISBEN','Días activos','Tickets mes']],
            body: lista.map((item, i) => {
                const diasSem = ['dia_lunes','dia_martes','dia_miercoles','dia_jueves','dia_viernes','dia_sabado'].filter(d => item[d]).length
                const tks     = calcTickets(item, mes)
                return [
                    i+1, item.nombre_completo, item.cedula,
                    item.universidad || '—',
                    item.destino || item.ruta || '—',
                    item.sisben || '—',
                    { content: `${diasSem} día${diasSem!==1?'s':''}/sem`, styles:{halign:'center'} },
                    { content: tks, styles:{halign:'center', fontStyle:'bold', textColor:[185,28,28]} }
                ]
            }),
            foot: [[
                { content:'TOTAL TICKETS SIN RECOGER', colSpan:6, styles:{halign:'right',fontStyle:'bold',fillColor:[254,242,242],textColor:[185,28,28]} },
                { content:'', styles:{fillColor:[254,242,242]} },
                { content:totalTks, styles:{halign:'center',fontStyle:'bold',fontSize:11,fillColor:[254,242,242],textColor:[185,28,28]} }
            ]],
            headStyles: { fillColor:[185,28,28], textColor:[255,255,255], fontSize:8, fontStyle:'bold' },
            footStyles: { fillColor:[254,242,242], textColor:[185,28,28], fontSize:9 },
            bodyStyles: { fontSize:8, cellPadding:2.5 },
            alternateRowStyles: { fillColor:[255,245,245] },
            columnStyles: { 0:{halign:'center',cellWidth:8}, 2:{font:'courier',fontSize:7.5}, 6:{halign:'center',cellWidth:22}, 7:{halign:'center',cellWidth:20} },
            margin: { left:14, right:14 },
        })
        return doc.lastAutoTable.finalY + 12
    }

    function buildUniversidades(doc, y, td, rev) {
        if (!rev || univData.length === 0) return y
        if (y > 220) { doc.addPage(); y = 14 }
        // Recalcular con td del mes visto
        const byU = {}
        listaIncluida.forEach(item => {
            const key = (item.universidad || 'Sin especificar').split(' - ')[0].trim().slice(0, 24)
            if (!byU[key]) byU[key] = { si:0, no:0 }
            if (td[item.cedula] === false) byU[key].no++; else byU[key].si++
        })
        const rows = Object.entries(byU).map(([name,v])=>({name,...v,total:v.si+v.no}))
            .sort((a,b)=>b.total-a.total).slice(0,10)
        if (rows.length === 0) return y
        y = agregarTituloSeccion(doc, y, 'DISTRIBUCIÓN POR UNIVERSIDAD / INSTITUCIÓN')
        autoTable(doc, {
            startY: y,
            head: [['Universidad / Institución','Sí Recogieron','No Recogieron','Total','% Asistencia']],
            body: rows.map(u => [
                u.name,
                {content:u.si, styles:{textColor:[22,163,74],fontStyle:'bold',halign:'center'}},
                {content:u.no, styles:{textColor:u.no>0?[185,28,28]:[150,150,150],halign:'center'}},
                {content:u.total, styles:{halign:'center'}},
                {content:`${u.total>0?Math.round(u.si/u.total*100):0}%`, styles:{halign:'center'}}
            ]),
            headStyles: { fillColor:[...VERDE2], textColor:[255,255,255], fontSize:8, fontStyle:'bold' },
            bodyStyles: { fontSize:8.5, cellPadding:3 },
            alternateRowStyles: { fillColor:[240,253,244] },
            margin: { left:14, right:14 },
        })
        return doc.lastAutoTable.finalY + 12
    }

    function buildHistoricoTable(doc, y, filtrado) {
        if (filtrado.length === 0) return y
        if (y > 210) { doc.addPage(); y = 14 }
        y = agregarTituloSeccion(doc, y,
            `HISTÓRICO DE DISTRIBUCIÓN — ${filtrado.map(h=>h.label).join(', ')}`, [88,28,135])
        autoTable(doc, {
            startY: y,
            head: [['Mes / Período','Sí Recogieron','No Recogieron','Total','% Asistencia','Estado']],
            body: filtrado.map(h => [
                { content: h.label,
                  styles: { fontStyle: h.mes===mesVista?'bold':'normal',
                             textColor: h.mes===mesVista?[...VERDE]:[50,50,50],
                             fillColor: h.mes===mesVista?[240,253,244]:[255,255,255] } },
                {content:h.siRecogieron, styles:{textColor:[22,163,74],fontStyle:'bold',halign:'center'}},
                {content:h.noRecogieron, styles:{textColor:h.noRecogieron>0?[185,28,28]:[150,150,150],halign:'center'}},
                {content:total, styles:{halign:'center'}},
                {content:`${h.pct}%`, styles:{halign:'center',fontStyle:'bold',textColor:h.pct>=85?[22,163,74]:h.pct>=60?[161,98,7]:[185,28,28]}},
                {content:h.pct>=85?'EXCELENTE':h.pct>=60?'REGULAR':'BAJO',
                 styles:{halign:'center',fontSize:7.5,fontStyle:'bold',textColor:h.pct>=85?[22,163,74]:h.pct>=60?[161,98,7]:[185,28,28]}},
            ]),
            headStyles: { fillColor:[88,28,135], textColor:[255,255,255], fontSize:8, fontStyle:'bold' },
            bodyStyles: { fontSize:8.5, cellPadding:3 },
            alternateRowStyles: { fillColor:[250,245,255] },
            margin: { left:14, right:14 },
        })
        return doc.lastAutoTable.finalY + 12
    }

    // ── Reporte de gastos: datos por persona para el mes visto ───
    function buildFilasReporte() {
        return listaIncluida
            .map(item => {
                const diasSem  = ['dia_lunes','dia_martes','dia_miercoles','dia_jueves','dia_viernes','dia_sabado'].filter(d => item[d]).length
                const tickets  = calcTickets(item, mesVista)
                const valDia   = getPrecioItem(item)
                const total    = tickets * valDia
                return { item, diasSem, tickets, valDia, total }
            })
            .sort((a, b) => a.item.nombre_completo.localeCompare(b.item.nombre_completo))
    }

    const exportarReporteExcel = async () => {
        const mesLabel = getMesLabel(mesVista).toUpperCase()
        const filas    = buildFilasReporte()
        const totalCOP = filas.reduce((s, r) => s + r.total, 0)

        const wb   = new ExcelJS.Workbook()
        const ws   = wb.addWorksheet(`Gastos ${mesLabel}`)

        // Logo
        try {
            const blob = await fetch('/logo_candelaria.png').then(r => r.blob())
            const b64  = await new Promise(res => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.readAsDataURL(blob) })
            const imgId = wb.addImage({ base64: b64, extension: 'png' })
            ws.addImage(imgId, { tl:{ col:0, row:0 }, ext:{ width:60, height:70 } })
        } catch {}

        // Cabecera
        ws.mergeCells('B1:H1'); ws.getCell('B1').value = 'ALCALDÍA MUNICIPAL DE CANDELARIA — VALLE DEL CAUCA'
        ws.getCell('B1').font = { bold:true, size:14 }; ws.getCell('B1').alignment = { horizontal:'center', vertical:'middle' }
        ws.mergeCells('B2:H2'); ws.getCell('B2').value = 'REPORTE DE GASTOS EN TICKETS TRANSPORTE UNIVERSITARIO'
        ws.getCell('B2').font = { bold:true, size:12 }; ws.getCell('B2').alignment = { horizontal:'center', vertical:'middle' }
        ws.mergeCells('B3:H3'); ws.getCell('B3').value = `Período: ${mesLabel}   ·   Generado: ${genTimestamp()}`
        ws.getCell('B3').font = { size:10 }; ws.getCell('B3').alignment = { horizontal:'center', vertical:'middle' }
        ws.getRow(1).height = 24; ws.getRow(2).height = 20; ws.getRow(3).height = 16

        ws.addRow([]) // fila vacía 4
        // Encabezados tabla
        const hdr = ws.addRow(['N°','Nombre Completo','Cédula','Destino / Ruta','Días/sem','Valor diario (ida+vuelta)','Tickets del mes','Total COP'])
        hdr.font = { bold:true, color:{ argb:'FFFFFFFF' } }
        hdr.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF145322' } }
        hdr.alignment = { horizontal:'center', vertical:'middle', wrapText:true }
        hdr.height = 28

        ws.columns = [
            { key:'n',      width:5  },
            { key:'nombre', width:38 },
            { key:'cedula', width:15 },
            { key:'dest',   width:24 },
            { key:'dias',   width:10 },
            { key:'vdia',   width:22 },
            { key:'tks',    width:15 },
            { key:'total',  width:20 },
        ]

        const fmtMoneda = '#,##0'
        filas.forEach((r, i) => {
            const row = ws.addRow([
                i + 1,
                r.item.nombre_completo,
                r.item.cedula,
                r.item.destino || r.item.ruta || '—',
                `${r.diasSem} día${r.diasSem !== 1 ? 's' : ''}/sem`,
                r.valDia,
                r.tickets,
                r.total,
            ])
            row.height = 18
            row.getCell(6).numFmt = fmtMoneda
            row.getCell(8).numFmt = fmtMoneda
            row.getCell(8).font   = { bold: true, color:{ argb: r.total > 0 ? 'FF14532D' : 'FF64748B' } }
            if (i % 2 === 0) {
                row.eachCell({ includeEmpty:true }, c => { c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF0FDF4' } } })
            }
            row.eachCell({ includeEmpty:true }, c => {
                c.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} }
                c.alignment = { vertical:'middle', horizontal: [1,3,5,7].includes(c.col) ? 'center' : c.col >= 6 ? 'right' : 'left' }
            })
        })

        // Fila total
        const totRow = ws.addRow(['','','','','TOTAL GENERAL','',`${filas.reduce((s,r)=>s+r.tickets,0)} tickets`,totalCOP])
        totRow.height = 22
        totRow.font  = { bold:true, size:11 }
        totRow.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF145322' } }
        totRow.getCell(5).font = { bold:true, color:{ argb:'FFFFFFFF' }, size:11 }
        totRow.getCell(7).font = { bold:true, color:{ argb:'FFFDE68A' }, size:11 }
        totRow.getCell(8).font = { bold:true, color:{ argb:'FFFDE68A' }, size:12 }
        totRow.getCell(8).numFmt = fmtMoneda
        totRow.eachCell({ includeEmpty:true }, c => {
            c.border = { top:{style:'medium'}, left:{style:'thin'}, bottom:{style:'medium'}, right:{style:'thin'} }
            c.alignment = { vertical:'middle', horizontal: c.col >= 5 ? 'center' : 'left' }
            if (!c.font?.color) c.font = { ...c.font, color:{ argb:'FFFFFFFF' } }
        })

        const buf  = await wb.xlsx.writeBuffer()
        saveAs(new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
               `REPORTE_GASTOS_TICKETS_${mesVista}.xlsx`)
    }

    const exportarReporteGastosPDF = async () => {
        const doc      = new jsPDF('p','mm','a4')
        const logo     = await cargarLogoBase64()
        const mesLabel = getMesLabel(mesVista).toUpperCase()
        const filas    = buildFilasReporte()
        const totalTks = filas.reduce((s, r) => s + r.tickets, 0)
        const totalCOP = filas.reduce((s, r) => s + r.total,   0)

        let y = agregarCabeceraPDF(doc, logo,
            'REPORTE DE GASTOS EN TICKETS',
            `Transporte universitario — Período: ${mesLabel}`,
            `Total beneficiarios: ${filas.length}   ·   Total tickets: ${totalTks}   ·   Total COP: ${fmtCOP(totalCOP)}`
        )

        y = agregarTituloSeccion(doc, y, `DETALLE POR BENEFICIARIO — ${filas.length} persona${filas.length !== 1 ? 's' : ''}`)

        autoTable(doc, {
            startY: y,
            head: [['#','Nombre Completo','Cédula','Destino / Ruta','Días/sem','Valor diario','Tickets','Total COP']],
            body: filas.map((r, i) => [
                i + 1,
                r.item.nombre_completo,
                r.item.cedula,
                r.item.destino || r.item.ruta || '—',
                { content: `${r.diasSem}d/sem`, styles:{ halign:'center' } },
                { content: r.valDia > 0 ? fmtCOP(r.valDia) : '—', styles:{ halign:'right', textColor: r.valDia > 0 ? [13,148,136] : [150,150,150] } },
                { content: r.tickets, styles:{ halign:'center', fontStyle:'bold', textColor:[88,28,135] } },
                { content: r.total > 0 ? fmtCOP(r.total) : '—', styles:{ halign:'right', fontStyle:'bold', textColor: r.total > 0 ? [...VERDE] : [150,150,150] } },
            ]),
            foot: [[
                { content:'', colSpan:4, styles:{ fillColor:[...VERDE], textColor:[255,255,255] } },
                { content:'TOTAL GENERAL', colSpan:2, styles:{ halign:'right', fontStyle:'bold', fontSize:10, fillColor:[...VERDE], textColor:[255,255,255] } },
                { content:totalTks, styles:{ halign:'center', fontStyle:'bold', fontSize:10, fillColor:[...VERDE], textColor:[...ORO] } },
                { content:fmtCOP(totalCOP), styles:{ halign:'right', fontStyle:'bold', fontSize:11, fillColor:[...VERDE], textColor:[...ORO] } },
            ]],
            headStyles: { fillColor:[...VERDE2], textColor:[255,255,255], fontSize:8, fontStyle:'bold' },
            footStyles: { fillColor:[...VERDE], textColor:[255,255,255], fontSize:9 },
            bodyStyles: { fontSize:8, cellPadding:2.5 },
            alternateRowStyles: { fillColor:[240,253,244] },
            columnStyles: { 0:{halign:'center',cellWidth:8}, 2:{font:'courier',fontSize:7.5}, 5:{halign:'right'}, 7:{halign:'right'} },
            margin: { left:14, right:14 },
        })

        agregarPiePaginas(doc)
        doc.save(`REPORTE_GASTOS_TICKETS_${mesVista}.pdf`)
    }

    // ── Exportar PDF del mes visto ────────────────────────────────
    const exportarPDF = async () => {
        const doc        = new jsPDF('p','mm','a4')
        const logoBase64 = await cargarLogoBase64()
        const mesLabel   = getMesLabel(mesVista).toUpperCase()
        const esMesActual = mesVista === mesAnio

        let y = agregarCabeceraPDF(
            doc, logoBase64,
            'INFORME DE DISTRIBUCIÓN DE TICKETS',
            `Período: ${mesLabel}${esMesActual ? '  (mes actual)' : ''}`,
            `Fecha de distribución: ${fmtFecha(fechaDistribucion)}`
        )

        y = buildResumenTable(doc, y, total, siCountVista, noRecogieronVista.length, pctVista,
                              ticketsNoRecVista, ticketsTotalVista, revisadoVista,
                              valorTotalVista, valorNoRecVista)

        if (!revisadoVista) {
            doc.setFillColor(255,251,235)
            doc.roundedRect(14, y, 182, 12, 2, 2, 'F')
            doc.setDrawColor(...ORO); doc.setLineWidth(0.4)
            doc.roundedRect(14, y, 182, 12, 2, 2, 'S')
            doc.setFontSize(9); doc.setFont(undefined,'bold')
            doc.setTextColor(...ORO); doc.text('AVISO:', 18, y+7.5)
            doc.setFont(undefined,'normal'); doc.setTextColor(120,80,0)
            doc.text('Este mes aún no tiene datos de revisión registrados.', 32, y+7.5)
            doc.setTextColor(0,0,0); y += 18
        }

        y = buildListaCompleta(doc, y, listaIncluida, tdVista, revisadoVista, mesVista)
        y = buildNoRecogieronDetalle(doc, y, noRecogieronVista, mesVista, revisadoVista)
        y = buildUniversidades(doc, y, tdVista, revisadoVista)
        buildHistoricoTable(doc, y, historicoFiltrado)

        agregarPiePaginas(doc)
        doc.save(`INFORME_TICKETS_CANDELARIA_${mesVista}.pdf`)
    }

    // ── Exportar PDF completo (todos los meses históricos) ────────
    const exportarPDFCompleto = async () => {
        setExportandoCompleto(true)
        try {
            const { data: allRecords } = await supabase
                .from('ticket_recojos')
                .select('cedula, mes_anio, recogio')
                .order('mes_anio')

            if (!allRecords || allRecords.length === 0) {
                alert('No hay datos históricos para exportar.')
                return
            }

            // Agrupar por mes, respetando exclusiones
            const byMonth = {}
            allRecords.forEach(r => {
                if (registrosExcluidos.has(r.cedula)) return
                if (!byMonth[r.mes_anio]) byMonth[r.mes_anio] = { noCedulas: new Set() }
                if (r.recogio === false) byMonth[r.mes_anio].noCedulas.add(r.cedula)
            })

            const meses = Object.keys(byMonth)
                .filter(m => byMonth[m].noCedulas.size > 0)
                .sort()

            if (meses.length === 0) {
                alert('No hay meses con registros de ausencia para exportar.')
                return
            }

            const doc        = new jsPDF('p','mm','a4')
            const logoBase64 = await cargarLogoBase64()

            // Calcular promedio de asistencia y tickets acumulados
            let totalTicketsAcum = 0
            const promedioAsi = Math.round(
                meses.reduce((acc, m) => {
                    const noC        = byMonth[m].noCedulas.size
                    const noPersonas = Array.from(byMonth[m].noCedulas).map(c=>data.find(d=>d.cedula===c)).filter(Boolean)
                    totalTicketsAcum += noPersonas.reduce((s,item)=>s+calcTickets(item,m),0)
                    return acc + (total>0 ? (total-noC)/total*100 : 0)
                }, 0) / meses.length
            )

            const valorAcumTotal = hayPrecios
                ? meses.reduce((acc, m) => {
                    const noPersonas = Array.from(byMonth[m].noCedulas).map(c=>data.find(d=>d.cedula===c)).filter(Boolean)
                    return acc + noPersonas.reduce((s,item)=>s+calcTickets(item,m)*getPrecioItem(item),0)
                }, 0)
                : 0
            const valorAcumStr = hayPrecios && valorAcumTotal > 0 ? `   ·   Valor sin recoger (acum.): ${fmtCOP(valorAcumTotal)}` : ''
            let y = agregarCabeceraPDF(
                doc, logoBase64,
                'INFORME COMPLETO — DISTRIBUCIÓN DE TICKETS',
                `Meses con registros: ${meses.map(m=>getMesLabel(m)).join('  ·  ')}`,
                `Total períodos: ${meses.length}   ·   Promedio asistencia: ${promedioAsi}%   ·   Tickets sin recoger (acum.): ${totalTicketsAcum}${valorAcumStr}`
            )

            // ── Tabla resumen de todos los meses ──
            y = agregarTituloSeccion(doc, y, 'RESUMEN POR MES', [...VERDE])
            autoTable(doc, {
                startY: y,
                head: [hayPrecios
                    ? ['Mes / Período','Beneficiarios','Sí Recogieron','No Recogieron','Tickets mes','Tickets no rec.','Valor total (COP)','Valor no rec. (COP)','% Asistencia']
                    : ['Mes / Período','Beneficiarios','Sí Recogieron','No Recogieron','Tickets mes','Tickets no rec.','% Asistencia']
                ],
                body: meses.map(m => {
                    const noC        = byMonth[m].noCedulas.size
                    const siC        = Math.max(0, total - noC)
                    const p          = total > 0 ? Math.round(siC/total*100) : 0
                    const tksTot     = listaIncluida.reduce((s,item)=>s+calcTickets(item,m),0)
                    const noPersonas = Array.from(byMonth[m].noCedulas).map(c=>data.find(d=>d.cedula===c)).filter(Boolean)
                    const tksNoR     = noPersonas.reduce((s,item)=>s+calcTickets(item,m),0)
                    const row = [
                        { content: getMesLabel(m), styles:{fontStyle:'bold'} },
                        { content: total,  styles:{halign:'center'} },
                        { content: siC,    styles:{textColor:[22,163,74],fontStyle:'bold',halign:'center'} },
                        { content: noC,    styles:{textColor:noC>0?[185,28,28]:[150,150,150],halign:'center'} },
                        { content: tksTot, styles:{halign:'center',textColor:[88,28,135]} },
                        { content: tksNoR, styles:{halign:'center',fontStyle:'bold',textColor:[185,28,28]} },
                    ]
                    if (hayPrecios) {
                        const valTot = listaIncluida.reduce((s,item)=>s+calcTickets(item,m)*getPrecioItem(item),0)
                        const valNoR = noPersonas.reduce((s,item)=>s+calcTickets(item,m)*getPrecioItem(item),0)
                        row.push({ content: fmtCOP(valTot), styles:{halign:'center',fontStyle:'bold',textColor:[13,148,136]} })
                        row.push({ content: fmtCOP(valNoR), styles:{halign:'center',fontStyle:'bold',textColor:valNoR>0?[185,28,28]:[100,100,100]} })
                    }
                    row.push({ content: `${p}%`,styles:{halign:'center',fontStyle:'bold',textColor:p>=85?[22,163,74]:p>=60?[161,98,7]:[185,28,28]} })
                    return row
                }),
                headStyles: { fillColor:[...VERDE], textColor:[255,255,255], fontSize:8, fontStyle:'bold' },
                bodyStyles: { fontSize:8.5, cellPadding:3 },
                alternateRowStyles: { fillColor:[240,253,244] },
                margin: { left:14, right:14 },
            })
            y = doc.lastAutoTable.finalY + 16

            // ── Detalle mes a mes ──
            meses.forEach(mes => {
                const noPersonas = Array.from(byMonth[mes].noCedulas)
                    .filter(c => !registrosExcluidos.has(c))
                    .map(c => data.find(d => d.cedula === c))
                    .filter(Boolean)

                if (noPersonas.length === 0) return
                if (y > 215) { doc.addPage(); y = 14 }

                const noC    = noPersonas.length
                const siC    = Math.max(0, total - noC)
                const p      = total > 0 ? Math.round(siC/total*100) : 0
                const tksTot = listaIncluida.reduce((s,item)=>s+calcTickets(item,mes),0)
                const tksNoR = noPersonas.reduce((s,item)=>s+calcTickets(item,mes),0)

                y = agregarTituloSeccion(doc, y,
                    `${getMesLabel(mes).toUpperCase()}  ·  Asistencia: ${p}%  ·  No recogieron: ${noC}  ·  Tickets sin recoger: ${tksNoR} de ${tksTot}`,
                    [185,28,28])

                autoTable(doc, {
                    startY: y,
                    head: [['#','Nombre Completo','Cédula','Universidad / Institución','Destino','SISBEN','Días/sem','Tickets']],
                    body: noPersonas.map((item, i) => {
                        const diasSem = ['dia_lunes','dia_martes','dia_miercoles','dia_jueves','dia_viernes','dia_sabado'].filter(d=>item[d]).length
                        const tks     = calcTickets(item, mes)
                        return [
                            i+1, item.nombre_completo, item.cedula,
                            item.universidad || '—',
                            item.destino || item.ruta || '—',
                            item.sisben || '—',
                            { content:`${diasSem}d/sem`, styles:{halign:'center'} },
                            { content:tks, styles:{halign:'center',fontStyle:'bold',textColor:[185,28,28]} }
                        ]
                    }),
                    foot: [[
                        { content:'TOTAL TICKETS SIN RECOGER', colSpan:6, styles:{halign:'right',fontStyle:'bold',fillColor:[254,242,242],textColor:[185,28,28]} },
                        { content:'', styles:{fillColor:[254,242,242]} },
                        { content:tksNoR, styles:{halign:'center',fontStyle:'bold',fontSize:11,fillColor:[254,242,242],textColor:[185,28,28]} }
                    ]],
                    headStyles: { fillColor:[127,29,29], textColor:[255,255,255], fontSize:8, fontStyle:'bold' },
                    footStyles: { fillColor:[254,242,242], textColor:[185,28,28] },
                    bodyStyles: { fontSize:8, cellPadding:2.5 },
                    alternateRowStyles: { fillColor:[255,245,245] },
                    columnStyles: { 0:{halign:'center',cellWidth:8}, 2:{font:'courier',fontSize:7.5}, 6:{halign:'center',cellWidth:18}, 7:{halign:'center',cellWidth:16} },
                    margin: { left:14, right:14 },
                })
                y = doc.lastAutoTable.finalY + 10
            })

            agregarPiePaginas(doc)
            const rango = `${getMesLabel(meses[0])}-${getMesLabel(meses[meses.length-1])}`
            doc.save(`INFORME_COMPLETO_CANDELARIA_${rango.replace(/\s/g,'_')}.pdf`)
        } finally {
            setExportandoCompleto(false)
        }
    }

    // ── Estilos helpers ──────────────────────────────────────────
    const tabStyle = (activo, color = C.verde) => ({
        padding:'5px 14px', borderRadius:'99px', border:`1px solid ${activo?color:'#cbd5e1'}`,
        fontSize:'11px', fontWeight:'600', cursor:'pointer', transition:'all 0.15s',
        background: activo?color:'white', color: activo?'white':'#64748b',
    })

    const btnMes = (activo) => ({
        padding:'4px 12px', borderRadius:'99px', border:'1px solid', fontSize:'11px',
        fontWeight:'600', cursor:'pointer', transition:'all 0.15s',
        background: activo?C.azul:'#f1f5f9', color: activo?'white':'#64748b',
        borderColor: activo?C.azul:'#cbd5e1',
    })

    const estadoBadge = (cedula) => {
        if (tdVista[cedula] === false) return { txt:'✗ No recogió', bg:'#fee2e2', color:'#991b1b' }
        if (revisadoVista)             return { txt:'✓ Recogió',    bg:'#dcfce7', color:'#166534' }
        return { txt:'— Sin dato', bg:'#f1f5f9', color:'#64748b' }
    }

    return (
        <div
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100 }}
            onClick={onClose}
        >
            <div
                style={{ background:'white', borderRadius:'16px', width:'98%', maxWidth:'980px', maxHeight:'95vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 30px 60px rgba(0,0,0,0.35)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div style={{ display:'flex', flexShrink:0 }}>
                    <div style={{ background:'white', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'center', borderRight:'3px solid #ca8a04', minWidth:'84px' }}>
                        <img src="/logo_candelaria.png" alt="Candelaria" style={{ height:'62px', objectFit:'contain' }} onError={e=>{e.target.style.display='none'}} />
                    </div>
                    <div style={{ flex:1, background:'linear-gradient(135deg,#14532d,#15803d)', padding:'14px 20px', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                            <p style={{ margin:0, fontSize:'10px', opacity:0.75, letterSpacing:'0.05em', textTransform:'uppercase' }}>
                                Alcaldía Municipal de Candelaria · Valle del Cauca
                            </p>
                            <h2 style={{ margin:'3px 0', fontSize:'16px', fontWeight:'800' }}>
                                📊 Informe de Distribución de Tickets
                            </h2>
                            <p style={{ margin:0, fontSize:'11px', opacity:0.85 }}>
                                Viendo: <strong>{getMesLabel(mesVista)}</strong>
                                {mesVista !== mesAnio && <span style={{ marginLeft:'6px', background:'rgba(202,138,4,0.35)', padding:'1px 7px', borderRadius:'99px', fontSize:'10px' }}>histórico</span>}
                                {mesVista === mesAnio && !revisadoMesActual && <span style={{ marginLeft:'8px', background:'rgba(251,191,36,0.3)', padding:'1px 8px', borderRadius:'99px', fontSize:'10px', color:'#fef9c3' }}>⏳ Sin revisión</span>}
                                {totalExcluidos > 0 && <span style={{ marginLeft:'8px', background:'rgba(255,255,255,0.2)', padding:'1px 8px', borderRadius:'99px', fontSize:'10px' }}>{totalExcluidos} excluido{totalExcluidos>1?'s':''}</span>}
                            </p>
                        </div>
                        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexShrink:0, marginLeft:'12px', flexWrap:'wrap', justifyContent:'flex-end' }}>
                            <select
                                value={mesVista}
                                onChange={e => setMesVista(e.target.value)}
                                style={{ padding:'6px 10px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.15)', color:'white', fontSize:'11px', fontWeight:'600', cursor:'pointer', outline:'none' }}
                            >
                                {mesesDisponibles.map(({ mes, label }) => (
                                    <option key={mes} value={mes} style={{ background:'#14532d', color:'white' }}>{label}</option>
                                ))}
                            </select>
                            <button onClick={exportarPDF} style={{ padding:'7px 14px', background:'#ca8a04', border:'none', borderRadius:'8px', color:'white', cursor:'pointer', fontWeight:'700', fontSize:'12px', whiteSpace:'nowrap' }}>
                                📄 Informe mes
                            </button>
                            <button onClick={exportarPDFCompleto} disabled={exportandoCompleto} style={{ padding:'7px 14px', background:exportandoCompleto?'#6b7280':'#7c3aed', border:'none', borderRadius:'8px', color:'white', cursor:exportandoCompleto?'wait':'pointer', fontWeight:'700', fontSize:'12px', whiteSpace:'nowrap' }}>
                                {exportandoCompleto ? '⏳ Generando...' : '📋 Completo'}
                            </button>
                            <button onClick={exportarReporteExcel} style={{ padding:'7px 14px', background:'#15803d', border:'none', borderRadius:'8px', color:'white', cursor:'pointer', fontWeight:'700', fontSize:'12px', whiteSpace:'nowrap' }}>
                                💰 Gastos Excel
                            </button>
                            <button onClick={exportarReporteGastosPDF} style={{ padding:'7px 14px', background:'#0f766e', border:'none', borderRadius:'8px', color:'white', cursor:'pointer', fontWeight:'700', fontSize:'12px', whiteSpace:'nowrap' }}>
                                💰 Gastos PDF
                            </button>
                            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'8px', color:'white', cursor:'pointer', fontSize:'18px', padding:'5px 11px', lineHeight:1 }}>✕</button>
                        </div>
                    </div>
                </div>
                <div style={{ height:'3px', background:'linear-gradient(90deg,#ca8a04,#fde68a,#ca8a04)', flexShrink:0 }} />

                {/* ── Body ── */}
                <div style={{ overflowY:'auto', flex:1, padding:'20px 24px' }}>

                    {cargandoSnap && (
                        <div style={{ marginBottom:'12px', padding:'10px 16px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'10px', color:'#1e40af', fontSize:'12px', fontWeight:'600' }}>
                            ⏳ Cargando datos históricos de {getMesLabel(mesVista)}...
                        </div>
                    )}
                    {mesVista !== mesAnio && !cargandoSnap && dataHistorica.length === 0 && (
                        <div style={{ marginBottom:'12px', padding:'10px 16px', background:'#fefce8', border:'1px solid #fde68a', borderRadius:'10px', color:'#854d0e', fontSize:'12px', fontWeight:'600' }}>
                            ⚠️ No hay snapshot guardado para {getMesLabel(mesVista)} — se muestran los datos actuales. El snapshot se guarda automáticamente al entrar al mes siguiente.
                        </div>
                    )}
                    {!revisadoVista && (
                        <div style={{ marginBottom:'16px', padding:'12px 16px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'10px', color:'#92400e', fontSize:'13px', fontWeight:'600', display:'flex', gap:'8px' }}>
                            ⏳ Sin datos de revisión para <strong>{getMesLabel(mesVista)}</strong>
                            {mesVista === mesAnio && ' — ve a la tabla principal y marca quiénes no recogieron.'}
                        </div>
                    )}

                    {/* Stat Cards del mes visto */}
                    <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap' }}>
                        <StatCard label="Total Beneficiarios" value={total} color={C.azul} sub={totalExcluidos>0?`${totalExcluidos} excluido${totalExcluidos!==1?'s':''}`:undefined} />
                        <StatCard label="Sí Recogieron" value={revisadoVista?siCountVista:'—'} color={C.si} sub={revisadoVista?`${pctVista}% del total`:'Sin datos'} />
                        <StatCard label="No Recogieron" value={revisadoVista?noRecogieronVista.length:'—'} color={C.no} sub={revisadoVista?`${100-pctVista}% del total`:'Sin datos'} />
                        <StatCard label="% Asistencia" value={revisadoVista?`${pctVista}%`:'—'} color={!revisadoVista?C.naranja:pctVista>=85?C.si:pctVista>=60?C.naranja:C.no} sub={!revisadoVista?'Pendiente':pctVista>=85?'Excelente':pctVista>=60?'Regular':'Bajo'} />
                        <StatCard label="Tickets no recogidos" value={revisadoVista?ticketsNoRecVista:'—'} color='#7c3aed' sub={revisadoVista?`de ${ticketsTotalVista} del mes`:'Sin datos'} />
                        {hayPrecios && <StatCard label="Valor total tickets" value={fmtCOP(valorTotalVista)} color='#0d9488' sub={revisadoVista && valorNoRecVista > 0 ? `Sin recoger: ${fmtCOP(valorNoRecVista)}` : undefined} />}
                    </div>

                    {/* Gráficas del mes visto */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1.8fr', gap:'16px', marginBottom:'20px' }}>
                        <Card>
                            <SectionTitle>🔵 Distribución General</SectionTitle>
                            {revisadoVista && total > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value"
                                            label={({ percent }) => `${Math.round(percent*100)}%`} labelLine={false}>
                                            {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip content={<TooltipPie total={total} />} />
                                        <Legend formatter={v=><span style={{fontSize:'11px'}}>{v}</span>} iconSize={10} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p style={{ textAlign:'center', color:'#94a3b8', fontSize:'13px', paddingTop:'55px' }}>{revisadoVista?'Sin datos':'Pendiente de revisión'}</p>
                            )}
                        </Card>
                        <Card>
                            <SectionTitle>🏫 Por Universidad</SectionTitle>
                            {revisadoVista && univData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={univData} layout="vertical" margin={{ left:0, right:16, top:0, bottom:0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize:9 }} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize:9 }} width={100} />
                                        <Tooltip content={<TooltipBar />} />
                                        <Legend formatter={v=><span style={{fontSize:'10px'}}>{v}</span>} iconSize={10} />
                                        <Bar dataKey="si" name="Sí recogió" fill={C.si} radius={[0,4,4,0]} maxBarSize={18} />
                                        <Bar dataKey="no" name="No recogió" fill={C.no} radius={[0,4,4,0]} maxBarSize={18} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p style={{ textAlign:'center', color:'#94a3b8', fontSize:'13px', paddingTop:'55px' }}>{revisadoVista?'Sin datos':'Pendiente de revisión'}</p>
                            )}
                        </Card>
                    </div>

                    {revisadoVista && destData.length > 1 && (
                        <Card style={{ marginBottom:'20px' }}>
                            <SectionTitle>🗺️ Por Destino</SectionTitle>
                            <ResponsiveContainer width="100%" height={140}>
                                <BarChart data={destData} margin={{ left:0, right:16, top:0, bottom:0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize:10 }} />
                                    <YAxis tick={{ fontSize:10 }} />
                                    <Tooltip content={<TooltipBar />} />
                                    <Legend formatter={v=><span style={{fontSize:'10px'}}>{v}</span>} iconSize={10} />
                                    <Bar dataKey="si" name="Sí recogió" fill={C.verde} radius={[4,4,0,0]} maxBarSize={30} />
                                    <Bar dataKey="no" name="No recogió" fill={C.no} radius={[4,4,0,0]} maxBarSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    )}

                    {/* Banner tickets no recogidos */}
                    {revisadoVista && noRecogieronVista.length > 0 && (
                        <div style={{ marginBottom:'20px', padding:'14px 18px', background:'#fdf4ff', border:'1.5px solid #e9d5ff', borderRadius:'12px', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
                            <span style={{ fontSize:'22px' }}>🎟️</span>
                            <div style={{ flex:1 }}>
                                <div style={{ fontSize:'13px', fontWeight:'700', color:'#6b21a8' }}>
                                    Control de tickets — {getMesLabel(mesVista)}
                                </div>
                                <div style={{ fontSize:'12px', color:'#7e22ce', marginTop:'3px' }}>
                                    <strong>{noRecogieronVista.length}</strong> persona{noRecogieronVista.length!==1?'s':''} no recogieron →&nbsp;
                                    <strong style={{ fontSize:'15px' }}>{ticketsNoRecVista}</strong> ticket{ticketsNoRecVista!==1?'s':''} sin entregar
                                    &nbsp;(de <strong>{ticketsTotalVista}</strong> del mes, sin festivos)
                                </div>
                                {hayPrecios && (
                                    <div style={{ fontSize:'12px', color:'#6b21a8', marginTop:'4px' }}>
                                        Valor sin recoger: <strong style={{ color:'#dc2626', fontSize:'14px' }}>{fmtCOP(valorNoRecVista)}</strong>
                                        &nbsp;· Valor total del mes: <strong>{fmtCOP(valorTotalVista)}</strong>
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                                <div style={{ fontSize:'28px', fontWeight:'800', color:'#7c3aed' }}>{ticketsNoRecVista}</div>
                                <div style={{ fontSize:'10px', color:'#9333ea' }}>tickets pendientes</div>
                                {hayPrecios && (
                                    <div style={{ fontSize:'13px', fontWeight:'800', color:'#dc2626', marginTop:'4px' }}>{fmtCOP(valorNoRecVista)}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Tabla de beneficiarios ── */}
                    <div style={{ marginBottom:'24px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', flexWrap:'wrap', gap:'8px' }}>
                            <h3 style={{ margin:0, fontSize:'13px', fontWeight:'700', color:'#334155' }}>
                                📋 Listado de Beneficiarios — {getMesLabel(mesVista)}
                            </h3>
                            {totalExcluidos > 0 && (
                                <button onClick={() => setRegistrosExcluidos(new Set())} style={{ fontSize:'11px', padding:'4px 12px', borderRadius:'99px', border:'1px solid #cbd5e1', background:'white', color:'#64748b', cursor:'pointer' }}>
                                    ↺ Incluir todos en PDF
                                </button>
                            )}
                        </div>

                        <div style={{ display:'flex', gap:'6px', marginBottom:'10px', flexWrap:'wrap', alignItems:'center' }}>
                            <button style={tabStyle(filtroTabla==='TODOS', C.verde)} onClick={()=>setFiltroTabla('TODOS')}>Todos ({data.length})</button>
                            <button style={tabStyle(filtroTabla==='NO_RECOGIERON', C.no)} onClick={()=>setFiltroTabla('NO_RECOGIERON')}>✗ No recogieron ({noRecogieronListVista.length})</button>
                            <button style={tabStyle(filtroTabla==='SI_RECOGIERON', C.si)} onClick={()=>setFiltroTabla('SI_RECOGIERON')}>✓ Sí / Sin dato ({siRecogieronListVista.length})</button>
                            <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="🔍 Nombre o cédula..."
                                style={{ flex:1, minWidth:'160px', padding:'5px 10px', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'12px', outline:'none' }} />
                        </div>

                        <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid #e2e8f0', maxHeight:'340px', overflowY:'auto' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                                <thead style={{ position:'sticky', top:0, zIndex:2 }}>
                                    <tr style={{ background:'#14532d' }}>
                                        <th style={{ padding:'9px 10px', textAlign:'center', fontWeight:'700', color:'white', borderBottom:'2px solid #ca8a04', width:'48px' }} title="Incluir en PDF">PDF</th>
                                        {['#','Nombre Completo','Cédula','Universidad','Destino','SISBEN','Tickets','Estado'].map(h => (
                                            <th key={h} style={{ padding:'9px 10px', textAlign:'left', fontWeight:'700', color:'white', borderBottom:'2px solid #ca8a04', whiteSpace:'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {datosTabla.length === 0 ? (
                                        <tr><td colSpan={10} style={{ padding:'24px', textAlign:'center', color:'#94a3b8' }}>Sin resultados</td></tr>
                                    ) : datosTabla.map((item, i) => {
                                        const noVino   = tdVista[item.cedula] === false
                                        const excluido = registrosExcluidos.has(item.cedula)
                                        const badge    = estadoBadge(item.cedula)
                                        const tks      = calcTickets(item, mesVista)
                                        return (
                                            <tr key={item.id} style={{ borderBottom:'1px solid #f1f5f9', background: excluido?'#fafafa':noVino?(i%2===0?'#fff5f5':'#fff8f8'):(i%2===0?'white':'#f9fafb'), opacity:excluido?0.45:1, transition:'opacity 0.2s' }}>
                                                <td style={{ padding:'7px 10px', textAlign:'center' }}>
                                                    <input type="checkbox" checked={!excluido} onChange={()=>toggleRegistro(item.cedula)}
                                                        style={{ width:'15px', height:'15px', cursor:'pointer', accentColor:'#14532d' }}
                                                        title={excluido?'Incluir en PDF':'Excluir del PDF'} />
                                                </td>
                                                <td style={{ padding:'7px 10px', color:'#94a3b8', fontSize:'11px' }}>{i+1}</td>
                                                <td style={{ padding:'7px 10px', fontWeight:'600', textDecoration:excluido?'line-through':'none' }}>{item.nombre_completo}</td>
                                                <td style={{ padding:'7px 10px', fontFamily:'monospace', fontSize:'11px' }}>{item.cedula}</td>
                                                <td style={{ padding:'7px 10px', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.universidad||'—'}</td>
                                                <td style={{ padding:'7px 10px' }}>{item.destino||'—'}</td>
                                                <td style={{ padding:'7px 10px' }}>
                                                    {item.sisben?<span style={{ padding:'2px 8px', borderRadius:'99px', background:'#eff6ff', color:'#1e40af', fontWeight:'700', fontSize:'10px' }}>{item.sisben}</span>:<span style={{ color:'#d1d5db' }}>—</span>}
                                                </td>
                                                <td style={{ padding:'7px 10px', textAlign:'center' }}>
                                                    <span style={{ padding:'2px 8px', borderRadius:'99px', background:noVino?'#f3e8ff':'#f1f5f9', color:noVino?'#7c3aed':'#64748b', fontWeight:'700', fontSize:'11px' }}>
                                                        {tks}
                                                    </span>
                                                </td>
                                                <td style={{ padding:'7px 10px' }}>
                                                    <span style={{ padding:'3px 10px', borderRadius:'99px', fontWeight:'700', fontSize:'10px', background:badge.bg, color:badge.color, whiteSpace:'nowrap' }}>{badge.txt}</span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalExcluidos > 0 && (
                            <div style={{ marginTop:'8px', padding:'7px 14px', background:'#fffbeb', borderRadius:'8px', border:'1px solid #fde68a', fontSize:'11px', color:'#92400e' }}>
                                ℹ️ <strong>{totalExcluidos} persona{totalExcluidos>1?'s':''}</strong> excluida{totalExcluidos>1?'s':''} del PDF — activa la casilla para incluir.
                            </div>
                        )}
                    </div>

                    {/* ── Histórico ── */}
                    {!cargando && historico.length >= 1 && (
                        <div>
                            <SectionTitle
                                right={
                                    <div style={{ display:'flex', gap:'6px' }}>
                                        <button onClick={()=>setMesesSeleccionados(new Set(historico.map(h=>h.mes)))} style={tabStyle(false)}>Todos</button>
                                        <button onClick={()=>setMesesSeleccionados(new Set())} style={tabStyle(false)}>Ninguno</button>
                                    </div>
                                }
                            >📈 Histórico por Mes</SectionTitle>

                            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'14px', padding:'10px 14px', background:'#f1f5f9', borderRadius:'10px', border:'1px solid #e2e8f0' }}>
                                <span style={{ fontSize:'11px', fontWeight:'700', color:'#475569', alignSelf:'center', marginRight:'4px' }}>Meses en PDF:</span>
                                {historico.map(h => (
                                    <button key={h.mes} onClick={()=>toggleMes(h.mes)} style={btnMes(mesesSeleccionados.has(h.mes))}>
                                        {h.label}{h.mes===mesAnio?' ★':''}
                                    </button>
                                ))}
                            </div>

                            {historicoFiltrado.length > 1 && (
                                <Card style={{ marginBottom:'16px' }}>
                                    <ResponsiveContainer width="100%" height={190}>
                                        <BarChart data={historicoFiltrado} margin={{ left:0, right:20, top:0, bottom:24 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="label" tick={{ fontSize:10 }} angle={-20} textAnchor="end" interval={0} />
                                            <YAxis tick={{ fontSize:10 }} />
                                            <Tooltip content={<TooltipBar />} />
                                            <Legend formatter={v=><span style={{fontSize:'10px'}}>{v}</span>} iconSize={10} />
                                            <Bar dataKey="siRecogieron" name="Sí recogieron" fill={C.verde} radius={[4,4,0,0]} maxBarSize={30} />
                                            <Bar dataKey="noRecogieron" name="No recogieron" fill={C.no} radius={[4,4,0,0]} maxBarSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                            )}

                            {historicoFiltrado.length > 0 ? (
                                <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid #e2e8f0' }}>
                                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                                        <thead>
                                            <tr style={{ background:'#f1f5f9' }}>
                                                {['Mes','Sí Recogieron','No Recogieron','Total','% Asistencia'].map(h=>(
                                                    <th key={h} style={{ padding:'8px 12px', textAlign:'center', fontWeight:'700', color:'#334155', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historicoFiltrado.map(h => (
                                                <tr key={h.mes} style={{ borderBottom:'1px solid #f1f5f9', background:h.mes===mesVista?'#f0fdf4':'white' }}>
                                                    <td style={{ padding:'8px 12px', fontWeight:h.mes===mesVista?'700':'500', color:h.mes===mesVista?'#14532d':'#334155' }}>
                                                        {h.label}
                                                        {h.mes===mesAnio&&<span style={{ fontSize:'10px', background:'#bbf7d0', color:'#14532d', padding:'1px 6px', borderRadius:'99px', marginLeft:'6px' }}>actual</span>}
                                                        {h.mes===mesVista&&h.mes!==mesAnio&&<span style={{ fontSize:'10px', background:'#e0f2fe', color:'#0369a1', padding:'1px 6px', borderRadius:'99px', marginLeft:'6px' }}>viendo</span>}
                                                    </td>
                                                    <td style={{ padding:'8px 12px', textAlign:'center', color:C.si, fontWeight:'700' }}>{h.siRecogieron}</td>
                                                    <td style={{ padding:'8px 12px', textAlign:'center', color:h.noRecogieron>0?C.no:'#94a3b8', fontWeight:h.noRecogieron>0?'700':'400' }}>{h.noRecogieron}</td>
                                                    <td style={{ padding:'8px 12px', textAlign:'center', color:'#64748b' }}>{total}</td>
                                                    <td style={{ padding:'8px 12px', textAlign:'center' }}>
                                                        <span style={{ padding:'2px 10px', borderRadius:'99px', fontWeight:'700', fontSize:'11px', background:h.pct>=85?'#dcfce7':h.pct>=60?'#fef9c3':'#fee2e2', color:h.pct>=85?'#166534':h.pct>=60?'#854d0e':'#991b1b' }}>
                                                            {h.pct}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ padding:'20px', background:'#f8fafc', borderRadius:'10px', border:'1px solid #e2e8f0', textAlign:'center', color:'#94a3b8', fontSize:'13px' }}>
                                    Selecciona al menos un mes para ver el histórico.
                                </div>
                            )}
                        </div>
                    )}

                    {cargando && <p style={{ textAlign:'center', color:'#94a3b8', fontSize:'13px', padding:'16px' }}>Cargando histórico...</p>}
                </div>
            </div>
        </div>
    )
}
