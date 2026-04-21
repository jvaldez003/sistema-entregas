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

    const filtered = data.filter(d => 
        d.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
        d.cedula.includes(search)
    )

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

            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Entrega de Papeles</h1>
                    <p className={styles.sub}>Control documental de beneficiarios</p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary" onClick={() => setShowPreview(true)} disabled={data.length === 0}>
                        📥 Descargar Reporte
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
