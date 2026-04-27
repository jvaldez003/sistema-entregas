import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { importPapelesFromExcel, exportPapelesToExcel } from '../services/papelesService'
import styles from './EntregaPapelesPage.module.css'

const ESTADOS = ['SÍ ENTREGÓ', 'NO ENTREGÓ', 'APLICA', 'NO APLICA']

export default function EntregaPapelesPage() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [importing, setImporting] = useState(false)
    const [search, setSearch] = useState('')
    const [error, setError] = useState(null)
    const [showPreview, setShowPreview] = useState(false)
    const [showFormModal, setShowFormModal] = useState(false)
    const [modalMode, setModalMode] = useState('add') // 'add' o 'replace'
    const [selectedItem, setSelectedItem] = useState(null)
    const [formData, setFormData] = useState({
        nombre_completo: '',
        cedula: '',
        correo: '',
        telefono: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [statusFilter, setStatusFilter] = useState('TODOS')
    const fileInputRef = useRef(null)

    useEffect(() => {
        loadData()
    }, [])

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
            setData(data || [])
        }
        setLoading(false)
    }

    async function handleImport(e) {
        const file = e.target.files[0]
        if (!file) return

        setImporting(true)
        try {
            const importedData = await importPapelesFromExcel(file)
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

    async function cycleStatus(item) {
        const currentIdx = ESTADOS.indexOf(item.estado_entrega)
        const nextStatus = ESTADOS[(currentIdx + 1) % ESTADOS.length]
        
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

    function openAddModal() {
        setModalMode('add')
        setSelectedItem(null)
        setFormData({ nombre_completo: '', cedula: '', correo: '', telefono: '' })
        setShowFormModal(true)
    }

    function openReplaceModal(item) {
        setModalMode('replace')
        setSelectedItem(item)
        setFormData({
            nombre_completo: '', // Limpiar para el nuevo
            cedula: '',
            correo: '',
            telefono: ''
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
            telefono: item.telefono || ''
        })
        setShowFormModal(true)
    }

    async function handleFormSubmit(e) {
        e.preventDefault()
        if (!formData.nombre_completo || !formData.cedula) {
            return alert('Nombre y Cédula son obligatorios')
        }

        setSubmitting(true)
        try {
            if (modalMode === 'add') {
                const { error } = await supabase
                    .from('entrega_papeles')
                    .insert([{
                        ...formData,
                        nombre_completo: formData.nombre_completo.toUpperCase(),
                        estado_entrega: 'NO ENTREGÓ'
                    }])
                if (error) throw error
            } else if (modalMode === 'replace') {
                // Replace logic
                const { error } = await supabase
                    .from('entrega_papeles')
                    .update({
                        ...formData,
                        nombre_completo: formData.nombre_completo.toUpperCase(),
                        estado_entrega: 'NO ENTREGÓ'
                    })
                    .eq('id', selectedItem.id)
                if (error) throw error
            } else {
                // Edit logic
                const { error } = await supabase
                    .from('entrega_papeles')
                    .update({
                        ...formData,
                        nombre_completo: formData.nombre_completo.toUpperCase()
                        // Mantener el estado_entrega original
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
        const matchesStatus = statusFilter === 'TODOS' || d.estado_entrega === statusFilter
        return matchesSearch && matchesStatus
    })

    const stats = {
        total: data.length,
        entregaron: data.filter(d => d.estado_entrega === 'SÍ ENTREGÓ').length,
        noEntregaron: data.filter(d => d.estado_entrega === 'NO ENTREGÓ').length,
        aplica: data.filter(d => d.estado_entrega === 'APLICA').length,
        noAplica: data.filter(d => d.estado_entrega === 'NO APLICA').length,
    }

    const handleConfirmDownload = () => {
        exportPapelesToExcel(data)
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
                                Se generará un archivo Excel con 3 hojas organizadas. Resumen de datos actuales:
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
                            <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
                                ℹ️ El archivo incluirá colores corporativos, bordes y columnas auto-ajustadas para una lectura clara.
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
                        <form onSubmit={handleFormSubmit}>
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
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: 50 }}>No.</th>
                                    <th>Nombre Completo</th>
                                    <th>Cédula</th>
                                    <th>Correo</th>
                                    <th>Teléfono</th>
                                    <th>Estado Entrega</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td>{idx + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{item.nombre_completo}</td>
                                        <td>{item.cedula}</td>
                                        <td style={{ color: 'var(--text3)', fontSize: 13 }}>{item.correo || '—'}</td>
                                        <td>{item.telefono || '—'}</td>
                                        <td>
                                            <button 
                                                className={`${styles.statusBadge} ${
                                                    item.estado_entrega === 'SÍ ENTREGÓ' ? styles.statusSi :
                                                    item.estado_entrega === 'NO ENTREGÓ' ? styles.statusNo :
                                                    item.estado_entrega === 'APLICA' ? styles.statusAplica :
                                                    styles.statusNoAplica
                                                }`}
                                                onClick={() => cycleStatus(item)}
                                            >
                                                {item.estado_entrega}
                                            </button>
                                        </td>
                                        <td>
                                            <div className={styles.actionsCell}>
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
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className={styles.emptyState}>No se encontraron resultados para "{search}"</div>
                        )}
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
        </div>
    )
}
