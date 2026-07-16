import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { importPapelesFromExcel, exportPapelesToExcel, exportContactosToCSV, calcularEdadExacta, resolverTarifaOficial } from '../services/papelesService'
import { exportAsistenciaToExcel, exportAsistenciaToPDF, getColombianHolidays } from '../services/asistenciaExportService'
import Select, { components } from 'react-select'
import CreatableSelect from 'react-select/creatable'
import styles from './EntregaPapelesPage.module.css'
import InformeTicketsModal from '../components/InformeTicketsModal'

const ESTADOS = ['SÍ ENTREGÓ', 'NO ENTREGÓ', 'APLICA', 'NO APLICA']

const opcionesSisben = [
    {
        label: 'Sin clasificación',
        options: [
            { value: 'Sin SISBEN', label: 'Sin SISBEN / No tiene' },
        ]
    },
    {
        label: 'Grupo A — Pobreza Extrema',
        options: [
            { value: 'A1', label: 'A1 — Pobreza Extrema' },
            { value: 'A2', label: 'A2 — Pobreza Extrema' },
            { value: 'A3', label: 'A3 — Pobreza Extrema' },
            { value: 'A4', label: 'A4 — Pobreza Extrema' },
            { value: 'A5', label: 'A5 — Pobreza Extrema' },
        ]
    },
    {
        label: 'Grupo B — Pobreza Moderada',
        options: [
            { value: 'B1', label: 'B1 — Pobreza Moderada' },
            { value: 'B2', label: 'B2 — Pobreza Moderada' },
            { value: 'B3', label: 'B3 — Pobreza Moderada' },
            { value: 'B4', label: 'B4 — Pobreza Moderada' },
            { value: 'B5', label: 'B5 — Pobreza Moderada' },
            { value: 'B6', label: 'B6 — Pobreza Moderada' },
            { value: 'B7', label: 'B7 — Pobreza Moderada' },
        ]
    },
    {
        label: 'Grupo C — Vulnerable',
        options: [
            { value: 'C1',  label: 'C1 — Vulnerable' },
            { value: 'C2',  label: 'C2 — Vulnerable' },
            { value: 'C3',  label: 'C3 — Vulnerable' },
            { value: 'C4',  label: 'C4 — Vulnerable' },
            { value: 'C5',  label: 'C5 — Vulnerable' },
            { value: 'C6',  label: 'C6 — Vulnerable' },
            { value: 'C7',  label: 'C7 — Vulnerable' },
            { value: 'C8',  label: 'C8 — Vulnerable' },
            { value: 'C9',  label: 'C9 — Vulnerable' },
            { value: 'C10', label: 'C10 — Vulnerable' },
            { value: 'C11', label: 'C11 — Vulnerable' },
            { value: 'C12', label: 'C12 — Vulnerable' },
            { value: 'C13', label: 'C13 — Vulnerable' },
            { value: 'C14', label: 'C14 — Vulnerable' },
            { value: 'C15', label: 'C15 — Vulnerable' },
            { value: 'C16', label: 'C16 — Vulnerable' },
            { value: 'C17', label: 'C17 — Vulnerable' },
            { value: 'C18', label: 'C18 — Vulnerable' },
        ]
    },
    {
        label: 'Grupo D — No Pobre, No Vulnerable',
        options: [
            { value: 'D01', label: 'D01 — No pobre, no vulnerable' },
            { value: 'D02', label: 'D02 — No pobre, no vulnerable' },
            { value: 'D03', label: 'D03 — No pobre, no vulnerable' },
            { value: 'D04', label: 'D04 — No pobre, no vulnerable' },
            { value: 'D05', label: 'D05 — No pobre, no vulnerable' },
            { value: 'D06', label: 'D06 — No pobre, no vulnerable' },
            { value: 'D07', label: 'D07 — No pobre, no vulnerable' },
            { value: 'D08', label: 'D08 — No pobre, no vulnerable' },
            { value: 'D09', label: 'D09 — No pobre, no vulnerable' },
            { value: 'D10', label: 'D10 — No pobre, no vulnerable' },
            { value: 'D11', label: 'D11 — No pobre, no vulnerable' },
            { value: 'D12', label: 'D12 — No pobre, no vulnerable' },
            { value: 'D13', label: 'D13 — No pobre, no vulnerable' },
            { value: 'D14', label: 'D14 — No pobre, no vulnerable' },
            { value: 'D15', label: 'D15 — No pobre, no vulnerable' },
            { value: 'D16', label: 'D16 — No pobre, no vulnerable' },
            { value: 'D17', label: 'D17 — No pobre, no vulnerable' },
            { value: 'D18', label: 'D18 — No pobre, no vulnerable' },
            { value: 'D19', label: 'D19 — No pobre, no vulnerable' },
            { value: 'D20', label: 'D20 — No pobre, no vulnerable' },
            { value: 'D21', label: 'D21 — No pobre, no vulnerable' },
        ]
    },
]

const todosOpcionesSisben = opcionesSisben.flatMap(g => g.options)

const opcionesResidencia = [
    { value: 'Cabecera Municipal', label: 'Cabecera Municipal' },
    { value: 'Villagorgona', label: 'Villagorgona' },
    { value: 'El Carmelo', label: 'El Carmelo' },
    { value: 'Poblado Campestre', label: 'Poblado Campestre' },
    { value: 'San Joaquín', label: 'San Joaquín' },
    { value: 'El Tiple', label: 'El Tiple' },
    { value: 'Juanchito', label: 'Juanchito' },
    { value: 'San Vicente', label: 'San Vicente' },
    { value: 'Buchitolo', label: 'Buchitolo' },
    { value: 'El Arenal', label: 'El Arenal' },
    { value: 'El Lauro', label: 'El Lauro' },
    { value: 'Domingo Largo', label: 'Domingo Largo' },
    { value: 'La Victoria', label: 'La Victoria' },
    { value: 'Otro', label: 'Otro' }
];

const opcionesDestino = [
    { value: 'Cali', label: 'Cali' },
    { value: 'Palmira', label: 'Palmira' },
    { value: 'Candelaria', label: 'Candelaria' },
    { value: 'Yumbo', label: 'Yumbo' },
    { value: 'Otro', label: 'Otro' }
];

const opcionesRuta = [
    { value: 'Ruta 1', label: 'Ruta 1' },
    { value: 'Ruta 2', label: 'Ruta 2' },
    { value: 'Ruta 3', label: 'Ruta 3' },
    { value: 'Ruta 4', label: 'Ruta 4' },
    { value: 'Ruta 5', label: 'Ruta 5' }
];

const opcionesUniversidad = [
    // Candelaria
    { value: 'INTEP - Candelaria', label: 'INTEP - Candelaria' },
    { value: 'SENA - Candelaria', label: 'SENA - Candelaria' },
    
    // Univalle
    { value: 'Universidad del Valle - Cali', label: 'Universidad del Valle - Cali' },
    { value: 'Universidad del Valle - Palmira', label: 'Universidad del Valle - Palmira' },
    { value: 'Universidad del Valle - Yumbo', label: 'Universidad del Valle - Yumbo' },
    
    // SENA
    { value: 'SENA - Cali', label: 'SENA - Cali' },
    { value: 'SENA - Palmira', label: 'SENA - Palmira' },
    { value: 'SENA - Yumbo', label: 'SENA - Yumbo' },
    
    // Nacional
    { value: 'Universidad Nacional - Palmira', label: 'Universidad Nacional - Palmira' },
    
    // USC
    { value: 'Universidad Santiago de Cali - Cali', label: 'Universidad Santiago de Cali - Cali' },
    { value: 'Universidad Santiago de Cali - Palmira', label: 'Universidad Santiago de Cali - Palmira' },
    
    // Privadas Cali
    { value: 'Universidad Icesi - Cali', label: 'Universidad Icesi - Cali' },
    { value: 'Pontificia Universidad Javeriana - Cali', label: 'Pontificia Universidad Javeriana - Cali' },
    { value: 'Universidad Autónoma de Occidente (UAO) - Cali', label: 'Universidad Autónoma de Occidente (UAO) - Cali' },
    { value: 'Universidad San Buenaventura - Cali', label: 'Universidad San Buenaventura - Cali' },
    { value: 'Universidad Libre - Cali', label: 'Universidad Libre - Cali' },
    { value: 'Institución Universitaria Antonio José Camacho - Cali', label: 'Institución Universitaria Antonio José Camacho - Cali' },
    { value: 'Escuela Nacional del Deporte - Cali', label: 'Escuela Nacional del Deporte - Cali' },
    { value: 'Bellas Artes - Cali', label: 'Bellas Artes - Cali' },
    
    // Privadas Palmira
    { value: 'Corporación Universitaria Remington - Palmira', label: 'Corporación Universitaria Remington - Palmira' },
    { value: 'Universidad Pontificia Bolivariana (UPB) - Palmira', label: 'Universidad Pontificia Bolivariana (UPB) - Palmira' },
    
    // Otros
    { value: 'Otro', label: 'Otro' }
];

const selectStyles = {
    control: (base) => ({
        ...base,
        minHeight: '42px',
        borderRadius: '8px',
        borderColor: '#e2e8f0',
        boxShadow: 'none',
        '&:hover': {
            borderColor: '#0284c7'
        }
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#0284c7' : state.isFocused ? '#e0f2fe' : 'white',
        color: state.isSelected ? 'white' : '#334155',
        cursor: 'pointer'
    }),
    menuPortal: base => ({ ...base, zIndex: 9999 })
};

const CustomOption = (props) => {
    const { selectProps, data } = props;
    const { onEditOption, onDeleteOption } = selectProps;

    return (
        <components.Option {...props}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>{data.label}</span>
                {data.__isNew__ ? null : (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if(onEditOption) onEditOption(data);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                            title="Editar"
                        >
                            ✏️
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if(onDeleteOption) onDeleteOption(data);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                            title="Eliminar"
                        >
                            🗑️
                        </button>
                    </div>
                )}
            </div>
        </components.Option>
    );
};

export default function EntregaPapelesPage() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [importing, setImporting] = useState(false)
    const [search, setSearch] = useState('')
    const [error, setError] = useState(null)
    const [showPreview, setShowPreview] = useState(false)
    const [showAsistenciaModal, setShowAsistenciaModal] = useState(false)
    const [showFormModal, setShowFormModal] = useState(false)
    const [modalMode, setModalMode] = useState('add') // 'add' o 'replace'
    const [selectedItem, setSelectedItem] = useState(null)
    const [optsResidencia, setOptsResidencia] = useState(opcionesResidencia)
    const [optsDestino, setOptsDestino] = useState(opcionesDestino)
    const [optsUniversidad, setOptsUniversidad] = useState(opcionesUniversidad)
    const [optsRuta, setOptsRuta] = useState(opcionesRuta)
    const [formData, setFormData] = useState({
        nombre_completo: '',
        cedula: '',
        correo: '',
        telefono: '',
        fecha_nacimiento: '',
        semestre: '',
        sisben: '',
        residencia: '',
        destino: '',
        horario: '',
        ruta: '',
        dia_lunes: false,
        dia_martes: false,
        dia_miercoles: false,
        dia_jueves: false,
        dia_viernes: false,
        dia_sabado: false,
        novedad_observacion: '',
        ruta_ida: '',
        valor_ida: '',
        ruta_regreso: '',
        valor_regreso: '',
        is_new: false
    })
    const [submitting, setSubmitting] = useState(false)
    const [statusFilter, setStatusFilter] = useState('TODOS')
    const [showInforme, setShowInforme] = useState(false)
    const [fechaEntrega, setFechaEntrega] = useState(() => new Date().toISOString().split('T')[0])
    const [fechaDistribucion, setFechaDistribucion] = useState(() => new Date().toISOString().split('T')[0])
    const [ticketData, setTicketData] = useState({})
    const fileInputRef = useRef(null)

    // mesAnio se deriva de la fecha de distribución — no es un estado separado
    const mesAnio = fechaDistribucion ? fechaDistribucion.slice(0, 7) : ''

    const getMesLabel = (m) => {
        if (!m) return ''
        const [year, month] = m.split('-')
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        return `${meses[parseInt(month) - 1]} ${year}`
    }

    useEffect(() => { loadData() }, [])
    useEffect(() => { if (mesAnio) loadTicketData(mesAnio) }, [mesAnio])

    async function loadData() {
        setLoading(true)
        setError(null)
        const { data, error } = await supabase
            .from('entrega_papeles')
            .select('*')
            .order('nombre_completo')

        if (error) {
            console.error('Error cargando datos:', error)
            setError('No se pudo cargar la tabla. Asegúrate de haber ejecutado el SQL en Supabase.')
        } else {
            const rows = data || []
            setData(rows)
            guardarSnapshotMesAnterior(rows)
            sincronizarTarifasOficiales(rows)
        }
        setLoading(false)
    }

    async function sincronizarTarifasOficiales(beneficiarios) {
        if (!beneficiarios?.length) return
        const updates = []
        for (const item of beneficiarios) {
            const tarifa = resolverTarifaOficial(item.residencia, item.destino)
            if (!tarifa) continue
            const ida = String(item.valor_ida || '').replace(/[^\d]/g, '')
            const regreso = String(item.valor_regreso || '').replace(/[^\d]/g, '')
            if (ida === tarifa && regreso === tarifa) continue
            updates.push({ id: item.id, valor_ida: tarifa, valor_regreso: tarifa })
        }
        if (!updates.length) return

        // Actualizar en lote (uno a uno para no pisar otros campos)
        const results = await Promise.all(updates.map(u =>
            supabase.from('entrega_papeles').update({ valor_ida: u.valor_ida, valor_regreso: u.valor_regreso }).eq('id', u.id)
        ))
        const failed = results.some(r => r.error)
        if (!failed) {
            setData(prev => prev.map(item => {
                const u = updates.find(x => x.id === item.id)
                return u ? { ...item, valor_ida: u.valor_ida, valor_regreso: u.valor_regreso } : item
            }))
        }
    }

    async function guardarSnapshotMesAnterior(beneficiarios) {
        if (!beneficiarios.length) return
        const now  = new Date()
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const mes  = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`

        const { count } = await supabase
            .from('beneficiarios_mes')
            .select('id', { count: 'exact', head: true })
            .eq('mes_anio', mes)

        if (count === 0) {
            const rows = beneficiarios.map(item => ({
                cedula:          item.cedula,
                mes_anio:        mes,
                nombre_completo: item.nombre_completo,
                valor_ida:       item.valor_ida    || null,
                valor_regreso:   item.valor_regreso || null,
                destino:         item.destino      || null,
                universidad:     item.universidad  || null,
                ruta:            item.ruta         || null,
                dia_lunes:       !!item.dia_lunes,
                dia_martes:      !!item.dia_martes,
                dia_miercoles:   !!item.dia_miercoles,
                dia_jueves:      !!item.dia_jueves,
                dia_viernes:     !!item.dia_viernes,
                dia_sabado:      !!item.dia_sabado,
                sisben:          item.sisben       || null,
            }))
            await supabase.from('beneficiarios_mes').upsert(rows, { onConflict: 'cedula,mes_anio' })
        }
    }

    async function loadTicketData(mes) {
        if (!mes) return
        const { data: records, error } = await supabase
            .from('ticket_recojos')
            .select('cedula, recogio')
            .eq('mes_anio', mes)
        if (!error && records) {
            const map = {}
            records.forEach(r => { map[r.cedula] = r.recogio })
            setTicketData(map)
        }
    }

    async function handleImport(e) {
        const file = e.target.files[0]
        if (!file) return

        setImporting(true)
        try {
            const importedData = await importPapelesFromExcel(file, data)
            if (importedData.length > 0) {
                const uniqueDataMap = new Map()
                importedData.forEach(item => {
                    uniqueDataMap.set(item.cedula, item)
                })
                const finalData = Array.from(uniqueDataMap.values())

                const { error } = await supabase
                    .from('entrega_papeles')
                    .upsert(finalData, { onConflict: 'cedula' })
                
                if (error) alert('Error al importar: ' + error.message)
                else {
                    alert(`Éxito: Se cargaron ${finalData.length} registros.`)
                    loadData()
                }
            }
        } catch (err) {
            console.error(err)
            alert('Error: ' + err.message)
        } finally {
            setImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    async function changeStatus(item, nextStatus) {
        const { error } = await supabase
            .from('entrega_papeles')
            .update({ estado_entrega: nextStatus })
            .eq('id', item.id)
        
        if (error) alert('Error: ' + error.message)
        else {
            setData(prev => prev.map(d => d.id === item.id ? { ...d, estado_entrega: nextStatus } : d))
        }
    }

    async function clearAll() {
        if (!window.confirm('¿Estás seguro de que deseas eliminar TODOS los registros de papeles?')) return
        const { error } = await supabase.from('entrega_papeles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (error) alert('Error: ' + error.message)
        else loadData()
    }

    async function toggleTicket(item) {
        const current = ticketData[item.cedula]
        const newValue = current === false ? null : false
        try {
            if (newValue === null) {
                const { error } = await supabase
                    .from('ticket_recojos')
                    .delete()
                    .eq('cedula', item.cedula)
                    .eq('mes_anio', mesAnio)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('ticket_recojos')
                    .upsert({ cedula: item.cedula, mes_anio: mesAnio, recogio: newValue }, { onConflict: 'cedula,mes_anio' })
                if (error) throw error
            }
            setTicketData(prev => {
                const next = { ...prev }
                if (newValue === null) delete next[item.cedula]
                else next[item.cedula] = newValue
                return next
            })
        } catch (err) { alert('Error: ' + err.message) }
    }

    async function resetTicketPickup() {
        if (!window.confirm(`¿Reiniciar el registro de tickets de ${getMesLabel(mesAnio)} para todos los estudiantes?`)) return
        const { error } = await supabase
            .from('ticket_recojos')
            .delete()
            .eq('mes_anio', mesAnio)
        if (error) alert('Error: ' + error.message)
        else setTicketData({})
    }

    async function deleteRecord(item) {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${item.nombre_completo}?`)) return
        
        const { error } = await supabase
            .from('entrega_papeles')
            .delete()
            .eq('id', item.id)
            
        if (error) alert('Error al eliminar: ' + error.message)
        else {
            setData(prev => prev.filter(d => d.id !== item.id))
        }
    }

    const handleEditOption = (type, option) => {
        const newLabel = window.prompt(`Editar opción:`, option.label);
        if (newLabel && newLabel.trim() !== '') {
            const updatedOption = { ...option, label: newLabel.trim(), value: newLabel.trim() };
            if (type === 'residencia') setOptsResidencia(prev => prev.map(o => o.value === option.value ? updatedOption : o));
            if (type === 'destino') setOptsDestino(prev => prev.map(o => o.value === option.value ? updatedOption : o));
            if (type === 'universidad') setOptsUniversidad(prev => prev.map(o => o.value === option.value ? updatedOption : o));
            if (type === 'ruta') setOptsRuta(prev => prev.map(o => o.value === option.value ? updatedOption : o));
            
            if (formData[type] === option.value) {
                setFormData(prev => ({ ...prev, [type]: updatedOption.value }));
            }
        }
    }

    const handleDeleteOption = (type, option) => {
        if (window.confirm(`¿Seguro que deseas eliminar "${option.label}"?`)) {
            if (type === 'residencia') setOptsResidencia(prev => prev.filter(o => o.value !== option.value));
            if (type === 'destino') setOptsDestino(prev => prev.filter(o => o.value !== option.value));
            if (type === 'universidad') setOptsUniversidad(prev => prev.filter(o => o.value !== option.value));
            if (type === 'ruta') setOptsRuta(prev => prev.filter(o => o.value !== option.value));
            
            if (formData[type] === option.value) {
                setFormData(prev => ({ ...prev, [type]: '' }));
            }
        }
    }

    function openAddModal() {
        setModalMode('add')
        setSelectedItem(null)
        setFormData({
            nombre_completo: '', cedula: '', correo: '', telefono: '',
            fecha_nacimiento: '', semestre: '',
            sisben: '',
            residencia: '', destino: '', universidad: '', horario: '', ruta: '',
            dia_lunes: false, dia_martes: false, dia_miercoles: false,
            dia_jueves: false, dia_viernes: false, dia_sabado: false,
            novedad_observacion: '',
            ruta_ida: '', valor_ida: '', ruta_regreso: '', valor_regreso: '',
            is_new: true
        })
        setShowFormModal(true)
    }

    function openReplaceModal(item) {
        setModalMode('replace')
        setSelectedItem(item)
        setFormData({
            nombre_completo: '',
            cedula: '',
            correo: '',
            telefono: '',
            fecha_nacimiento: '',
            semestre: '',
            sisben: item.sisben || '',
            residencia: item.residencia || '',
            destino: item.destino || '',
            universidad: item.universidad || '',
            horario: item.horario || '', 
            ruta: item.ruta || '',
            dia_lunes: !!item.dia_lunes, 
            dia_martes: !!item.dia_martes, 
            dia_miercoles: !!item.dia_miercoles, 
            dia_jueves: !!item.dia_jueves, 
            dia_viernes: !!item.dia_viernes, 
            dia_sabado: !!item.dia_sabado,
            novedad_observacion: '',
            ruta_ida: item.ruta_ida || (item.residencia && item.destino ? `${item.residencia} - ${item.destino}` : ''), 
            valor_ida: item.valor_ida || findPriceForRoute(item.residencia, item.destino) || '', 
            ruta_regreso: item.ruta_regreso || (item.residencia && item.destino ? `${item.destino} - ${item.residencia}` : ''), 
            valor_regreso: item.valor_regreso || findPriceForRoute(item.residencia, item.destino) || '',
            is_new: true
        })
        setShowFormModal(true)
    }

    function openEditModal(item) {
        setModalMode('edit')
        setSelectedItem(item)
        setFormData({
            nombre_completo: item.nombre_completo,
            cedula: item.cedula,
            correo: item.correo || '',
            telefono: item.telefono || '',
            fecha_nacimiento: item.fecha_nacimiento || '',
            semestre: item.semestre ?? '',
            sisben: item.sisben || '',
            residencia: item.residencia || '',
            destino: item.destino || '',
            universidad: item.universidad || '',
            horario: item.horario || '',
            ruta: item.ruta || '',
            dia_lunes: !!item.dia_lunes,
            dia_martes: !!item.dia_martes,
            dia_miercoles: !!item.dia_miercoles,
            dia_jueves: !!item.dia_jueves,
            dia_viernes: !!item.dia_viernes,
            dia_sabado: !!item.dia_sabado,
            novedad_observacion: item.novedad_observacion || '',
            ruta_ida: item.ruta_ida || '',
            valor_ida: resolverTarifaOficial(item.residencia, item.destino) || item.valor_ida || '',
            ruta_regreso: item.ruta_regreso || '',
            valor_regreso: resolverTarifaOficial(item.residencia, item.destino) || item.valor_regreso || '',
            is_new: !!item.is_new
        })
        setShowFormModal(true)
    }

    function findPriceForRoute(res, dest) {
        if (!res || !dest) return null;
        // Prioridad: tarifario oficial
        const oficial = resolverTarifaOficial(res, dest)
        if (oficial) return oficial
        // Si no está en el tarifario, conservar el valor ya usado en otros registros
        const match = data.find(item => 
            (item.residencia || '').toUpperCase() === res.toUpperCase() && 
            (item.destino || '').toUpperCase() === dest.toUpperCase() &&
            item.valor_ida
        );
        return match ? match.valor_ida : null;
    }

    async function handleFormSubmit(e) {
        e.preventDefault()
        if (!formData.nombre_completo || !formData.cedula) {
            return alert('Nombre y Cédula son obligatorios')
        }

        const sem = formData.semestre === '' || formData.semestre === null || formData.semestre === undefined
            ? null
            : Number(formData.semestre)
        if (sem !== null && (!Number.isFinite(sem) || sem < 1 || sem > 12 || !Number.isInteger(sem))) {
            return alert('El semestre debe ser un número entero entre 1 y 12.')
        }

        const edad = formData.fecha_nacimiento ? calcularEdadExacta(formData.fecha_nacimiento) : null
        if (edad && edad.years >= 29) {
            alert('⚠️ Atención: Esta persona tiene 29 años o más y no aplica para generar tickets / beneficio por edad.')
        }

        setSubmitting(true)
        try {
            const payload = {
                ...formData,
                semestre: sem,
            }
            if (modalMode === 'add') {
                const { error } = await supabase
                    .from('entrega_papeles')
                    .insert([{
                        ...payload,
                        nombre_completo: formData.nombre_completo.toUpperCase(),
                        estado_entrega: 'NO ENTREGÓ'
                    }])
                if (error) throw error
            } else if (modalMode === 'replace') {
                // Replace logic
                const { error } = await supabase
                    .from('entrega_papeles')
                    .update({
                        ...payload,
                        nombre_completo: formData.nombre_completo.toUpperCase(),
                        estado_entrega: 'NO ENTREGÓ',
                        is_replacement: true
                    })
                    .eq('id', selectedItem.id)
                if (error) throw error
            } else {
                // Edit logic
                // Detectar si se agregaron días de viaje a un registro que no tenía
                const oldDays = [
                    selectedItem.dia_lunes, selectedItem.dia_martes, selectedItem.dia_miercoles,
                    selectedItem.dia_jueves, selectedItem.dia_viernes, selectedItem.dia_sabado
                ].some(Boolean);
                
                const newDays = [
                    formData.dia_lunes, formData.dia_martes, formData.dia_miercoles,
                    formData.dia_jueves, formData.dia_viernes, formData.dia_sabado
                ].some(Boolean);

                const daysAddedLater = !oldDays && newDays;

                const { error } = await supabase
                    .from('entrega_papeles')
                    .update({
                        ...payload,
                        nombre_completo: formData.nombre_completo.toUpperCase(),
                        days_added_later: selectedItem.days_added_later || daysAddedLater
                    })
                    .eq('id', selectedItem.id)
                if (error) throw error
            }
            setShowFormModal(false)
            loadData()
        } catch (err) {
            alert('Error: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const filtered = data.filter(d => {
        const matchesSearch = d.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
                              d.cedula.includes(search)
        const matchesStatus = statusFilter === 'TODOS' ||
            d.estado_entrega === statusFilter ||
            (statusFilter === 'NO_RECOGIO_TICKET' && ticketData[d.cedula] === false)
        return matchesSearch && matchesStatus
    })

    const stats = {
        total: data.length,
        entregaron: data.filter(d => d.estado_entrega === 'SÍ ENTREGÓ').length,
        noEntregaron: data.filter(d => d.estado_entrega === 'NO ENTREGÓ').length,
        aplica: data.filter(d => d.estado_entrega === 'APLICA').length,
        noAplica: data.filter(d => d.estado_entrega === 'NO APLICA').length,
        noRecogieron: data.filter(d => ticketData[d.cedula] === false).length,
    }

    const handleConfirmDownload = () => {
        if (!fechaEntrega) return alert('Por favor, seleccione una fecha de entrega.');
        exportPapelesToExcel(data, fechaEntrega, ticketData)
        setShowPreview(false)
    }

    return (
        <div className={styles.page}>
            {/* Modal de Vista Previa */}
            {showPreview && (
                <div className={styles.modalOverlay} onClick={() => setShowPreview(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Vista previa de la descarga</h2>
                            <button className={styles.modalClose} onClick={() => setShowPreview(false)}>✕</button>
                        </div>
                        <div className={styles.modalBody}>
                            <p style={{ marginBottom: 20, color: 'var(--text2)' }}>
                                Se generará un archivo Excel con 4 hojas organizadas. Resumen de datos actuales:
                            </p>
                            <div className={styles.previewStats}>
                                <div className={`${styles.statItem} ${styles.statBlue}`}>
                                    <h4>Total Registros</h4>
                                    <span>{stats.total}</span>
                                </div>
                                <div className={`${styles.statItem} ${styles.statGreen}`}>
                                    <h4>Entregaron Papeles</h4>
                                    <span>{stats.entregaron}</span>
                                </div>
                                <div className={`${styles.statItem} ${styles.statRed}`}>
                                    <h4>No Entregaron</h4>
                                    <span>{stats.noEntregaron}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <h4>Otros (Aplica/No Aplica)</h4>
                                    <span>{stats.aplica + stats.noAplica}</span>
                                </div>
                            </div>

                            <div className={styles.formGroup} style={{ marginTop: '20px', marginBottom: '20px' }}>
                                <label style={{ fontWeight: 'bold' }}>Fecha de Entrega de Tickets:</label>
                                <input 
                                    type="date" 
                                    className={styles.input}
                                    value={fechaEntrega}
                                    onChange={e => setFechaEntrega(e.target.value)}
                                    style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                                    required
                                />
                                {(() => {
                                    if (!fechaEntrega) return null;
                                    const year = parseInt(fechaEntrega.split('-')[0]);
                                    const monthStr = fechaEntrega.split('-')[1];
                                    const monthYearKey = `${year}-${monthStr}`;
                                    const allHolidays = getColombianHolidays(year);
                                    
                                    const selectedIsHoliday = allHolidays.find(h => h.dateString === fechaEntrega);
                                    const monthHolidays = allHolidays.filter(h => h.dateString.startsWith(monthYearKey));

                                    return (
                                        <div style={{ marginTop: '12px' }}>
                                            {selectedIsHoliday && (
                                                <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', borderRadius: '6px', fontSize: '13px', marginBottom: '10px' }}>
                                                    ⚠️ <strong>¡Atención!</strong> El día seleccionado es festivo: <strong>{selectedIsHoliday.name}</strong>.
                                                </div>
                                            )}
                                            
                                            {monthHolidays.length > 0 ? (
                                                <div style={{ padding: '10px', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '6px' }}>
                                                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#0369a1' }}>
                                                        Festivos en este mes:
                                                    </p>
                                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#0c4a6e' }}>
                                                        {monthHolidays.map(h => (
                                                            <li key={h.dateString}>
                                                                <strong>{h.dateString.split('-')[2]}:</strong> {h.name}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>No hay festivos registrados en este mes.</p>
                                            )}
                                        </div>
                                    );
                                })()}
                                <small style={{ color: '#666', display: 'block', marginTop: '10px' }}>
                                    El "Total Mensual" se calculará automáticamente omitiendo los festivos listados arriba.
                                </small>
                            </div>

                            <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
                                ℹ️ El archivo incluye 2 pestañas principales: <strong>COMPLETO</strong> (todo el detalle) y <strong>PROVEEDOR TICKETS</strong> (solo columnas del proveedor). En el proveedor <strong>no aparecen</strong> personas con 29 años o más. Todas las columnas tienen filtro.
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleConfirmDownload}>
                                ✅ Confirmar y Descargar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Formato de Asistencia */}
            {showAsistenciaModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAsistenciaModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Formato de Asistencia</h2>
                            <button className={styles.modalClose} onClick={() => setShowAsistenciaModal(false)}>✕</button>
                        </div>
                        <div className={styles.modalBody}>
                            <p style={{ marginBottom: 20, color: 'var(--text2)' }}>
                                Seleccione la fecha de entrega de tickets para calcular automáticamente el total mensual.
                            </p>

                            <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
                                <label style={{ fontWeight: 'bold' }}>Fecha de Entrega de Tickets:</label>
                                <input 
                                    type="date" 
                                    className={styles.input}
                                    value={fechaEntrega}
                                    onChange={e => setFechaEntrega(e.target.value)}
                                    style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                                    required
                                />
                                {(() => {
                                    if (!fechaEntrega) return null;
                                    const year = parseInt(fechaEntrega.split('-')[0]);
                                    const monthStr = fechaEntrega.split('-')[1];
                                    const monthYearKey = `${year}-${monthStr}`;
                                    const allHolidays = getColombianHolidays(year);
                                    
                                    const selectedIsHoliday = allHolidays.find(h => h.dateString === fechaEntrega);
                                    const monthHolidays = allHolidays.filter(h => h.dateString.startsWith(monthYearKey));

                                    return (
                                        <div style={{ marginTop: '12px' }}>
                                            {selectedIsHoliday && (
                                                <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', borderRadius: '6px', fontSize: '13px', marginBottom: '10px' }}>
                                                    ⚠️ <strong>¡Atención!</strong> El día seleccionado es festivo: <strong>{selectedIsHoliday.name}</strong>.
                                                </div>
                                            )}
                                            
                                            {monthHolidays.length > 0 ? (
                                                <div style={{ padding: '10px', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '6px' }}>
                                                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#0369a1' }}>
                                                        Festivos en este mes:
                                                    </p>
                                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#0c4a6e' }}>
                                                        {monthHolidays.map(h => (
                                                            <li key={h.dateString}>
                                                                <strong>{h.dateString.split('-')[2]}:</strong> {h.name}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>No hay festivos registrados en este mes.</p>
                                            )}
                                        </div>
                                    );
                                })()}
                                <small style={{ color: '#666', display: 'block', marginTop: '10px' }}>
                                    El "Total Mensual" se calculará automáticamente omitiendo los festivos listados arriba.
                                </small>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px', marginBottom: '20px' }}>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ background: '#16a34a', border: 'none', padding: '12px 24px', fontSize: '15px' }}
                                    onClick={() => {
                                        if(!fechaEntrega) return alert('Por favor, seleccione una fecha de entrega.');
                                        exportAsistenciaToExcel(data, fechaEntrega);
                                        setShowAsistenciaModal(false);
                                    }}
                                >
                                    📊 Descargar Excel
                                </button>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ background: '#dc2626', border: 'none', padding: '12px 24px', fontSize: '15px' }}
                                    onClick={() => {
                                        if(!fechaEntrega) return alert('Por favor, seleccione una fecha de entrega.');
                                        exportAsistenciaToPDF(data, fechaEntrega);
                                        setShowAsistenciaModal(false);
                                    }}
                                >
                                    📄 Descargar PDF
                                </button>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn btn-secondary" onClick={() => setShowAsistenciaModal(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Formulario (Añadir/Remplazar) */}
            {showFormModal && (
                <div className={styles.modalOverlay} onClick={() => setShowFormModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{
                                modalMode === 'add' ? '➕ Añadir Nueva Persona' : 
                                modalMode === 'replace' ? '🔄 Remplazar Persona' : 
                                '✏️ Editar Registro'
                            }</h2>
                            <button className={styles.modalClose} onClick={() => setShowFormModal(false)}>✕</button>
                        </div>
                        <form className={styles.modalForm} onSubmit={handleFormSubmit}>
                            <div className={styles.modalBody}>
                                {modalMode === 'replace' && (
                                    <div className={styles.replaceNotice}>
                                        Sustituyendo a: <strong>{selectedItem?.nombre_completo}</strong>
                                    </div>
                                )}
                                <div className={styles.formGroup}>
                                    <label>Nombre Completo</label>
                                    <input 
                                        required
                                        value={formData.nombre_completo}
                                        onChange={e => setFormData({...formData, nombre_completo: e.target.value})}
                                        placeholder="Ej: JUAN PEREZ"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Cédula</label>
                                    <input 
                                        required
                                        value={formData.cedula}
                                        onChange={e => setFormData({...formData, cedula: e.target.value})}
                                        placeholder="Número de identificación"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Correo (Opcional)</label>
                                    <input 
                                        type="email"
                                        value={formData.correo}
                                        onChange={e => setFormData({...formData, correo: e.target.value})}
                                        placeholder="correo@ejemplo.com"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Teléfono (Opcional)</label>
                                    <input
                                        value={formData.telefono}
                                        onChange={e => setFormData({...formData, telefono: e.target.value})}
                                        placeholder="Número de contacto"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Fecha de Nacimiento (Opcional)</label>
                                    <input
                                        type="date"
                                        value={formData.fecha_nacimiento || ''}
                                        onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                                    />
                                    {(() => {
                                        const edad = formData.fecha_nacimiento ? calcularEdadExacta(formData.fecha_nacimiento) : null
                                        if (!edad) return null
                                        const over = edad.years >= 29
                                        return (
                                            <div className={`${styles.helperLine} ${over ? styles.helperWarn : ''}`}>
                                                Edad: <strong>{edad.years}</strong> años, {edad.months} meses, {edad.days} días
                                                {over ? <span className={styles.overAgeBadge}>⚠️ 29+ (sin ticket)</span> : null}
                                            </div>
                                        )
                                    })()}
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Semestre (1–12) (Opcional)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        step="1"
                                        value={formData.semestre ?? ''}
                                        onChange={e => setFormData({ ...formData, semestre: e.target.value })}
                                        placeholder="Ej: 3"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Grupo SISBEN IV (Opcional)</label>
                                    <Select
                                        options={opcionesSisben}
                                        value={todosOpcionesSisben.find(o => o.value === formData.sisben) || null}
                                        onChange={selected => setFormData({...formData, sisben: selected ? selected.value : ''})}
                                        placeholder="Seleccione grupo (ej: C5, B3...)"
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                        formatGroupLabel={group => (
                                            <div style={{ color: '#0284c7', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', padding: '4px 0' }}>
                                                {group.label}
                                            </div>
                                        )}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Residencia</label>
                                    <CreatableSelect 
                                        options={optsResidencia}
                                        value={optsResidencia.find(o => o.value === formData.residencia) || (formData.residencia ? { value: formData.residencia, label: formData.residencia } : null)}
                                        onChange={selected => {
                                            const val = selected ? selected.value : '';
                                            
                                            setFormData(prev => {
                                                const ns = {...prev, residencia: val};
                                                if (val && ns.destino) {
                                                    if (!ns.ruta_ida) {
                                                        const resLabel = val.toLowerCase().trim() === 'cabecera municipal' ? 'CANDELARIA' : val;
                                                        const destLabel = ns.destino.toLowerCase().trim() === 'cabecera municipal' ? 'CANDELARIA' : ns.destino;
                                                        ns.ruta_ida = `${resLabel} - ${destLabel}`;
                                                        ns.ruta_regreso = `${destLabel} - ${resLabel}`;
                                                    }
                                                    // Auto-completar valor si existe en otros registros
                                                    if (!ns.valor_ida) {
                                                        const price = findPriceForRoute(val, ns.destino);
                                                        if (price) {
                                                            ns.valor_ida = price;
                                                            ns.valor_regreso = price;
                                                        }
                                                    }
                                                }
                                                return ns;
                                            })
                                        }}
                                        onCreateOption={(inputValue) => {
                                            const newOption = { label: inputValue, value: inputValue };
                                            setOptsResidencia(prev => [...prev, newOption]);
                                            setFormData(prev => {
                                                const ns = {...prev, residencia: inputValue};
                                                if (inputValue && ns.destino) {
                                                    if (!ns.ruta_ida) {
                                                        const resLabel = inputValue.toLowerCase().trim() === 'cabecera municipal' ? 'CANDELARIA' : inputValue;
                                                        const destLabel = ns.destino.toLowerCase().trim() === 'cabecera municipal' ? 'CANDELARIA' : ns.destino;
                                                        ns.ruta_ida = `${resLabel} - ${destLabel}`;
                                                        ns.ruta_regreso = `${destLabel} - ${resLabel}`;
                                                    }
                                                    if (!ns.valor_ida) {
                                                        const price = findPriceForRoute(inputValue, ns.destino);
                                                        if (price) {
                                                            ns.valor_ida = price;
                                                            ns.valor_regreso = price;
                                                        }
                                                    }
                                                }
                                                return ns;
                                            })
                                        }}
                                        components={{ Option: CustomOption }}
                                        onEditOption={(opt) => handleEditOption('residencia', opt)}
                                        onDeleteOption={(opt) => handleDeleteOption('residencia', opt)}
                                        formatCreateLabel={(inputValue) => `Crear "${inputValue}"`}
                                        placeholder="Seleccione, busque o escriba..."
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Destino</label>
                                    <CreatableSelect 
                                        options={optsDestino}
                                        value={optsDestino.find(o => o.value === formData.destino) || (formData.destino ? { value: formData.destino, label: formData.destino } : null)}
                                        onChange={selected => {
                                            const val = selected ? selected.value : '';

                                            setFormData(prev => {
                                                const ns = {...prev, destino: val};
                                                if (val && ns.residencia) {
                                                    if (!ns.ruta_ida) {
                                                        const resLabel = ns.residencia.toLowerCase().trim() === 'cabecera municipal' ? 'CANDELARIA' : ns.residencia;
                                                        const destLabel = val.toLowerCase().trim() === 'cabecera municipal' ? 'CANDELARIA' : val;
                                                        ns.ruta_ida = `${resLabel} - ${destLabel}`;
                                                        ns.ruta_regreso = `${destLabel} - ${resLabel}`;
                                                    }
                                                    // Auto-completar valor
                                                    if (!ns.valor_ida) {
                                                        const price = findPriceForRoute(ns.residencia, val);
                                                        if (price) {
                                                            ns.valor_ida = price;
                                                            ns.valor_regreso = price;
                                                        }
                                                    }
                                                }
                                                return ns;
                                            })
                                        }}
                                        onCreateOption={(inputValue) => {
                                            const newOption = { label: inputValue, value: inputValue };
                                            setOptsDestino(prev => [...prev, newOption]);
                                            setFormData(prev => {
                                                const ns = {...prev, destino: inputValue};
                                                if (inputValue && ns.residencia) {
                                                    if (!ns.ruta_ida) {
                                                        const resLabel = ns.residencia.toLowerCase().trim() === 'cabecera municipal' ? 'CANDELARIA' : ns.residencia;
                                                        const destLabel = inputValue.toLowerCase().trim() === 'cabecera municipal' ? 'CANDELARIA' : inputValue;
                                                        ns.ruta_ida = `${resLabel} - ${destLabel}`;
                                                        ns.ruta_regreso = `${destLabel} - ${resLabel}`;
                                                    }
                                                    if (!ns.valor_ida) {
                                                        const price = findPriceForRoute(ns.residencia, inputValue);
                                                        if (price) {
                                                            ns.valor_ida = price;
                                                            ns.valor_regreso = price;
                                                        }
                                                    }
                                                }
                                                return ns;
                                            })
                                        }}
                                        components={{ Option: CustomOption }}
                                        onEditOption={(opt) => handleEditOption('destino', opt)}
                                        onDeleteOption={(opt) => handleDeleteOption('destino', opt)}
                                        formatCreateLabel={(inputValue) => `Crear "${inputValue}"`}
                                        placeholder="Seleccione, busque o escriba..."
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Universidad</label>
                                    <CreatableSelect 
                                        options={optsUniversidad}
                                        value={optsUniversidad.find(o => o.value === formData.universidad) || (formData.universidad ? { value: formData.universidad, label: formData.universidad } : null)}
                                        onChange={selected => setFormData({ ...formData, universidad: selected ? selected.value : '' })}
                                        onCreateOption={(inputValue) => {
                                            const newOption = { label: inputValue, value: inputValue };
                                            setOptsUniversidad(prev => [...prev, newOption]);
                                            setFormData({ ...formData, universidad: inputValue });
                                        }}
                                        components={{ Option: CustomOption }}
                                        onEditOption={(opt) => handleEditOption('universidad', opt)}
                                        onDeleteOption={(opt) => handleDeleteOption('universidad', opt)}
                                        formatCreateLabel={(inputValue) => `Crear "${inputValue}"`}
                                        placeholder="Seleccione, busque o escriba..."
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Horario (Opcional)</label>
                                    <input 
                                        className={styles.input}
                                        value={formData.horario}
                                        onChange={e => setFormData({...formData, horario: e.target.value})}
                                        placeholder="Ej: 08:00 - 17:00"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Ruta Asignada</label>
                                    <CreatableSelect 
                                        options={optsRuta}
                                        value={optsRuta.find(o => o.value === formData.ruta) || (formData.ruta ? { value: formData.ruta, label: formData.ruta } : null)}
                                        onChange={selected => setFormData({ ...formData, ruta: selected ? selected.value : '' })}
                                        onCreateOption={(inputValue) => {
                                            const newOption = { label: inputValue, value: inputValue };
                                            setOptsRuta(prev => [...prev, newOption]);
                                            setFormData({ ...formData, ruta: inputValue });
                                        }}
                                        components={{ Option: CustomOption }}
                                        onEditOption={(opt) => handleEditOption('ruta', opt)}
                                        onDeleteOption={(opt) => handleDeleteOption('ruta', opt)}
                                        formatCreateLabel={(inputValue) => `Crear "${inputValue}"`}
                                        placeholder="Seleccione, busque o escriba..."
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                    />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label>Días de Viaje</label>
                                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '8px' }}>
                                        {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map(dia => (
                                            <label key={dia} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={formData[`dia_${dia}`]}
                                                    onChange={e => setFormData({...formData, [`dia_${dia}`]: e.target.checked})}
                                                    style={{ width: 'auto', margin: 0 }}
                                                />
                                                {dia.charAt(0).toUpperCase() + dia.slice(1)}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                                    <label style={{ color: 'var(--primary)', fontWeight: 'bold', marginBottom: '10px', display: 'block', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>Información de Pasajes (Costos)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--text2)' }}>Ruta Ida</label>
                                            <input 
                                                type="text" 
                                                className={styles.input} 
                                                value={formData.ruta_ida} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    let reverse = '';
                                                    if (val.includes('-')) {
                                                        const parts = val.split('-').map(p => p.trim());
                                                        if (parts.length === 2) reverse = `${parts[1]} - ${parts[0]}`;
                                                    }
                                                    setFormData({
                                                        ...formData, 
                                                        ruta_ida: val,
                                                        ruta_regreso: (formData.ruta_regreso === '' || formData.ruta_regreso === reverse.split(' - ').reverse().join(' - ')) ? reverse : formData.ruta_regreso
                                                    })
                                                }} 
                                                placeholder="Ej: EL CARMELO - CALI" 
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--text2)' }}>Valor Ida</label>
                                            <input 
                                                type="text" 
                                                className={styles.input} 
                                                value={formData.valor_ida} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setFormData({
                                                        ...formData, 
                                                        valor_ida: val, 
                                                        valor_regreso: (formData.valor_regreso === '' || formData.valor_regreso === formData.valor_ida) ? val : formData.valor_regreso
                                                    })
                                                }} 
                                                placeholder="Ej: 4600" 
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--text2)' }}>Ruta Regreso</label>
                                            <input type="text" className={styles.input} value={formData.ruta_regreso} onChange={e => setFormData({...formData, ruta_regreso: e.target.value})} placeholder="Ej: CALI - EL CARMELO" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--text2)' }}>Valor Regreso</label>
                                            <input type="text" className={styles.input} value={formData.valor_regreso} onChange={e => setFormData({...formData, valor_regreso: e.target.value})} placeholder="Ej: 4600" />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label>Novedades / Observaciones Especiales</label>
                                    <textarea 
                                        className={styles.input}
                                        value={formData.novedad_observacion}
                                        onChange={e => setFormData({...formData, novedad_observacion: e.target.value})}
                                        placeholder="Escriba aquí novedades como cambios de horario, reemplazos manuales, etc."
                                        style={{ minHeight: '80px', paddingTop: '10px' }}
                                    />
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Guardando...' : 'Confirmar Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Entrega de Papeles</h1>
                    <p className={styles.sub}>Control documental de beneficiarios</p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary" onClick={() => setShowPreview(true)} disabled={data.length === 0}>
                        📥 Descargar Reporte
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowAsistenciaModal(true)} disabled={data.length === 0} style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                        📝 Formato Asistencia
                    </button>
                    <button className="btn btn-secondary" onClick={() => exportContactosToCSV(data)} disabled={data.length === 0} style={{ background: '#25D366', color: 'white', borderColor: '#20b958' }}>
                        💬 Contactos WhatsApp
                    </button>
                    <button className="btn btn-primary" style={{ background: '#059669' }} onClick={openAddModal}>
                        ➕ Añadir Persona
                    </button>
                    <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                        {importing ? 'Importando...' : '📤 Cargar Formato General'}
                    </button>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleImport} />
                    <button className="btn btn-secondary" style={{ background: '#fff5f5', color: '#c53030' }} onClick={clearAll}>
                        🗑 Limpiar
                    </button>
                </div>
            </div>

            {data.length === 0 && !loading ? (
                <div className={styles.uploadZone} onClick={() => fileInputRef.current?.click()}>
                    <span className={styles.uploadIcon}>📄</span>
                    <h3>Sube el listado general</h3>
                    <p>Haz clic aquí o usa el botón superior para cargar el archivo Excel</p>
                </div>
            ) : (
                <>
                    <div className={styles.searchRow}>
                        <input 
                            placeholder="🔍 Buscar por nombre o cédula..." 
                            className={styles.searchInput}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <div className={styles.stats}>
                            Total: <strong>{stats.total}</strong> | 
                            Entregaron: <strong style={{color: '#16a34a'}}>{stats.entregaron}</strong> | 
                            Pendientes: <strong style={{color: '#dc2626'}}>{stats.noEntregaron}</strong>
                        </div>
                    </div>
                    
                    {/* Panel de distribución de tickets */}
                    <div style={{ marginBottom: '16px', padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                        {/* Fila superior: título + fecha + estado + reiniciar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#166534' }}>🎫 Distribución de Tickets:</span>
                            <input
                                type="date"
                                value={fechaDistribucion}
                                onChange={e => {
                                    setFechaDistribucion(e.target.value)
                                    if (statusFilter === 'NO_RECOGIO_TICKET') setStatusFilter('TODOS')
                                }}
                                style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px', color: '#166534', fontWeight: '600', background: 'white', cursor: 'pointer' }}
                            />
                            {mesAnio && (
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#166534', background: 'white', padding: '4px 10px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                                    {getMesLabel(mesAnio)}
                                </span>
                            )}
                            <span style={{ fontSize: '13px', color: stats.noRecogieron > 0 ? '#991b1b' : '#166534' }}>
                                {stats.noRecogieron > 0
                                    ? `⚠️ ${stats.noRecogieron} no recogieron`
                                    : '✓ Sin ausencias registradas'}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                                <button
                                    onClick={() => setShowInforme(true)}
                                    disabled={data.length === 0}
                                    style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', background: '#0284c7', color: 'white', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}
                                >
                                    📊 Ver Informe
                                </button>
                                <button
                                    onClick={resetTicketPickup}
                                    disabled={Object.keys(ticketData).length === 0}
                                    style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', background: 'white', color: '#166534', fontWeight: '600', fontSize: '12px', cursor: 'pointer', opacity: Object.keys(ticketData).length === 0 ? 0.4 : 1 }}
                                >
                                    🔄 Reiniciar {getMesLabel(mesAnio)}
                                </button>
                            </div>
                        </div>

                        {/* Advertencias de festivos — igual que en los modales */}
                        {fechaDistribucion && (() => {
                            const year = parseInt(fechaDistribucion.split('-')[0])
                            const monthStr = fechaDistribucion.split('-')[1]
                            const monthYearKey = `${year}-${monthStr}`
                            const allHolidays = getColombianHolidays(year)
                            const selectedIsHoliday = allHolidays.find(h => h.dateString === fechaDistribucion)
                            const monthHolidays = allHolidays.filter(h => h.dateString.startsWith(monthYearKey))

                            return (
                                <div>
                                    {selectedIsHoliday && (
                                        <div style={{ padding: '7px 12px', background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', borderRadius: '6px', fontSize: '12px', marginBottom: '8px' }}>
                                            ⚠️ <strong>¡El día seleccionado es festivo!</strong> — {selectedIsHoliday.name}. Los tickets no se distribuyen este día.
                                        </div>
                                    )}
                                    {monthHolidays.length > 0 ? (
                                        <div style={{ padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px' }}>
                                            <strong style={{ color: '#1e40af' }}>Festivos en {getMesLabel(mesAnio)} (excluidos del total mensual):</strong>{' '}
                                            <span style={{ color: '#1e3a8a' }}>
                                                {monthHolidays.map(h => `${h.dateString.split('-')[2]}: ${h.name}`).join('  •  ')}
                                            </span>
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: '11px', color: '#166534', margin: 0 }}>No hay festivos en {getMesLabel(mesAnio)}.</p>
                                    )}
                                </div>
                            )
                        })()}
                    </div>

                    <div className={styles.filterTabs}>
                        <button 
                            className={`${styles.tab} ${statusFilter === 'TODOS' ? styles.tabActive : ''}`}
                            onClick={() => setStatusFilter('TODOS')}
                        >
                            Todos <span>({stats.total})</span>
                        </button>
                        <button 
                            className={`${styles.tab} ${statusFilter === 'SÍ ENTREGÓ' ? styles.tabActive : ''}`}
                            onClick={() => setStatusFilter('SÍ ENTREGÓ')}
                        >
                            Entregaron <span>({stats.entregaron})</span>
                        </button>
                        <button 
                            className={`${styles.tab} ${statusFilter === 'NO ENTREGÓ' ? styles.tabActive : ''}`}
                            onClick={() => setStatusFilter('NO ENTREGÓ')}
                        >
                            No Entregaron <span>({stats.noEntregaron})</span>
                        </button>
                        <button 
                            className={`${styles.tab} ${statusFilter === 'APLICA' ? styles.tabActive : ''}`}
                            onClick={() => setStatusFilter('APLICA')}
                        >
                            Aplica <span>({stats.aplica})</span>
                        </button>
                        <button
                            className={`${styles.tab} ${statusFilter === 'NO APLICA' ? styles.tabActive : ''}`}
                            onClick={() => setStatusFilter('NO APLICA')}
                        >
                            No Aplica <span>({stats.noAplica})</span>
                        </button>
                        {stats.noRecogieron > 0 && (
                            <button
                                className={`${styles.tab} ${statusFilter === 'NO_RECOGIO_TICKET' ? styles.tabActive : ''}`}
                                style={statusFilter !== 'NO_RECOGIO_TICKET' ? { background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' } : {}}
                                onClick={() => setStatusFilter('NO_RECOGIO_TICKET')}
                            >
                                🎫 No recogió ticket <span>({stats.noRecogieron})</span>
                            </button>
                        )}
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: 50 }}>No.</th>
                                    <th>Nombre Completo</th>
                                    <th>Cédula</th>
                                    <th>Edad / Semestre</th>
                                    <th>Correo / Tel</th>
                                    <th>Universidad</th>
                                    <th>Ruta</th>
                                    <th>Semanal</th>
                                    <th>Mensual</th>
                                    <th style={{ minWidth: 120 }}>🎫 {getMesLabel(mesAnio)}</th>
                                    <th style={{ minWidth: 280 }}>Estado y Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item, idx) => {
                                    // Calcular totales
                                    const totalSemanal = [
                                        item.dia_lunes, item.dia_martes, item.dia_miercoles, 
                                        item.dia_jueves, item.dia_viernes, item.dia_sabado
                                    ].filter(Boolean).length;
                                    const totalMensual = totalSemanal * 4;
                                    const edad = item.fecha_nacimiento ? calcularEdadExacta(item.fecha_nacimiento) : null
                                    const over = !!edad && edad.years >= 29

                                    return (
                                    <tr key={item.id}>
                                        <td>{idx + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{item.nombre_completo}</td>
                                        <td>{item.cedula}</td>
                                        <td style={{ fontSize: 13, lineHeight: '1.35' }}>
                                            <div className={over ? styles.overAgeText : undefined}>
                                                {edad ? `${edad.years}a ${edad.months}m ${edad.days}d` : '—'}
                                                {over ? <span className={styles.overAgeDot} title="Más de 29 años"> </span> : null}
                                            </div>
                                            <div style={{ color: 'var(--text3)' }}>
                                                Sem: {item.semestre ? item.semestre : '—'}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13, lineHeight: '1.4' }}>
                                            <div style={{ color: 'var(--text3)' }}>{item.correo || '—'}</div>
                                            <div>{item.telefono || '—'}</div>
                                        </td>
                                        <td>{item.universidad || '—'}</td>
                                        <td>{item.ruta || '—'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{totalSemanal}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#0284c7' }}>{totalMensual}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className={`${styles.ticketToggle} ${ticketData[item.cedula] === false ? styles.ticketNo : styles.ticketSi}`}
                                                onClick={() => toggleTicket(item)}
                                                title={ticketData[item.cedula] === false ? 'Haz clic para desmarcar' : 'Haz clic para marcar como No recogió'}
                                            >
                                                {ticketData[item.cedula] === false ? '✗ No vino' : '✓ Sí vino'}
                                            </button>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <select
                                                    value={item.estado_entrega}
                                                    onChange={(e) => changeStatus(item, e.target.value)}
                                                    className={`${styles.statusSelect} ${
                                                        item.estado_entrega === 'SÍ ENTREGÓ' ? styles.statusSi :
                                                        item.estado_entrega === 'NO ENTREGÓ' ? styles.statusNo :
                                                        item.estado_entrega === 'APLICA' ? styles.statusAplica :
                                                        styles.statusNoAplica
                                                    }`}
                                                >
                                                    <option value="SÍ ENTREGÓ">SÍ ENTREGÓ</option>
                                                    <option value="NO ENTREGÓ">NO ENTREGÓ</option>
                                                    <option value="APLICA">APLICA</option>
                                                    <option value="NO APLICA">NO APLICA</option>
                                                </select>
                                                <div className={styles.actionsCell} style={{ borderLeft: '1px solid var(--border)', paddingLeft: '10px' }}>
                                                    <button 
                                                        className={styles.editBtn}
                                                        onClick={() => openEditModal(item)}
                                                        title="Editar información"
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button 
                                                        className={styles.replaceBtn}
                                                        onClick={() => openReplaceModal(item)}
                                                        title="Remplazar persona"
                                                    >
                                                        🔄 Remplazar
                                                    </button>
                                                    <button 
                                                        className={styles.deleteBtn}
                                                        onClick={() => deleteRecord(item)}
                                                        title="Eliminar registro"
                                                    >
                                                        🗑️ Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className={styles.emptyState}>No se encontraron resultados para "{search}"</div>
                        )}
                    </div>

                    {/* Guía de colores */}
                    <div style={{ 
                        marginTop: '20px', 
                        padding: '15px', 
                        background: 'white', 
                        borderRadius: '10px', 
                        border: '1px solid var(--border)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text1)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px' }}>📊</span> GUÍA DE COLORES Y NOVEDADES (EXCEL):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                                <div style={{ width: '20px', height: '20px', backgroundColor: '#FFF9C4', border: '1px solid #f2e7a1', borderRadius: '4px' }}></div>
                                <span style={{ color: 'var(--text2)' }}><strong>Amarillo:</strong> Reemplazo de persona</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                                <div style={{ width: '20px', height: '20px', backgroundColor: '#B3E5FC', border: '1px solid #90caf9', borderRadius: '4px' }}></div>
                                <span style={{ color: 'var(--text2)' }}><strong>Azul:</strong> Días activados después</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                                <div style={{ width: '20px', height: '20px', backgroundColor: '#FFCC80', border: '1px solid #ffb74d', borderRadius: '4px' }}></div>
                                <span style={{ color: 'var(--text2)' }}><strong>Naranja:</strong> Novedad manual escrita</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                                <div style={{ width: '20px', height: '20px', backgroundColor: '#C8E6C9', border: '1px solid #81c784', borderRadius: '4px' }}></div>
                                <span style={{ color: 'var(--text2)' }}><strong>Verde Claro:</strong> Registro Nuevo Manual</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                                <div style={{ width: '20px', height: '20px', backgroundColor: '#C6EFCE', border: '1px solid #a5d6a7', borderRadius: '4px' }}></div>
                                <span style={{ color: 'var(--text2)' }}><strong>Verde:</strong> Entregó papeles</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                                <div style={{ width: '20px', height: '20px', backgroundColor: '#FFC7CE', border: '1px solid #ef9a9a', borderRadius: '4px' }}></div>
                                <span style={{ color: 'var(--text2)' }}><strong>Rojo:</strong> Pendiente de entrega</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
            
            {error && (
                <div className={styles.errorBanner}>
                    ⚠️ {error} <br/>
                    <small>Recuerda ejecutar el archivo <strong>supabase_papeles.sql</strong> en el editor SQL de Supabase.</small>
                </div>
            )}
            
            {loading && data.length === 0 && (
                <div className={styles.emptyState}>Cargando datos...</div>
            )}

            {showInforme && (
                <InformeTicketsModal
                    data={data}
                    ticketData={ticketData}
                    mesAnio={mesAnio}
                    fechaDistribucion={fechaDistribucion}
                    getMesLabel={getMesLabel}
                    onClose={() => setShowInforme(false)}
                    supabase={supabase}
                />
            )}
        </div>
    )
}
