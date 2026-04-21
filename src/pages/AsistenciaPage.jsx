import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { exportAsistenciaToExcel, importAsistenciaFromExcel } from '../services/asistenciaExcel'
import styles from './AsistenciaPage.module.css'
import AsistenciaPrint from './AsistenciaPrint'

export default function AsistenciaPage() {
    const [beneficiarios, setBeneficiarios] = useState([])
    const [loading, setLoading] = useState(true)
    const [importing, setImporting] = useState(false)
    const [search, setSearch] = useState('')
    const [isPrintMode, setIsPrintMode] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const { data, error } = await supabase
            .from('asistencia_beneficiarios')
            .select('*')
            .order('nombre_completo')
        
        if (error) console.error('Error cargando beneficiarios:', error)
        else {
            // Capa de soporte para datos antiguos (M, F) y nuevos (HOMBRE, MUJER)
            const resolved = (data || []).map(b => {
                let sexo = 'HOMBRE';
                if (b.sexo === 'MUJER' || b.sexo === 'F') {
                    sexo = 'MUJER';
                }
                return { ...b, sexo }
            })
            setBeneficiarios(resolved)
        }
        setLoading(false)
    }

    const handlePrint = () => {
        window.print()
    }

    async function handleExport() {
        await exportAsistenciaToExcel(beneficiarios)
    }

    async function handleImport(e) {
        const file = e.target.files[0]
        if (!file) return

        setImporting(true)
        try {
            const data = await importAsistenciaFromExcel(file)
            if (data.length > 0) {
                const { error } = await supabase
                    .from('asistencia_beneficiarios')
                    .upsert(data, { onConflict: 'documento' })
                
                if (error) alert('Error al importar: ' + error.message)
                else {
                    alert(`Éxito: Se cargaron ${data.length} registros.`)
                    loadData()
                }
            }
        } catch (err) {
            console.error(err)
            alert('Error al procesar el archivo Excel. Asegúrate de usar el formato correcto.')
        } finally {
            setImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    async function toggleGender(id, current) {
        // MUJER <-> HOMBRE
        const next = current === 'MUJER' ? 'HOMBRE' : 'MUJER'
        const { error } = await supabase
            .from('asistencia_beneficiarios')
            .update({ sexo: next })
            .eq('id', id)
        
        if (error) alert('Error: ' + error.message)
        else {
            setBeneficiarios(prev => prev.map(b => b.id === id ? { ...b, sexo: next } : b))
        }
    }

    async function clearAll() {
        if (!window.confirm('¿Estás seguro de que deseas eliminar TODOS los beneficiarios? Esta acción no se puede deshacer.')) return
        
        const { error } = await supabase
            .from('asistencia_beneficiarios')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')

        if (error) alert('Error al limpiar datos: ' + error.message)
        else loadData()
    }

    const filtered = beneficiarios.filter(b => 
        (b.nombre_completo || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.documento || '').includes(search)
    )

    return (
        <div className={styles.page}>
            <div className={`${styles.header} no-print`}>
                <div>
                    <h1 className={styles.title}>Listado de Asistencia</h1>
                    <p className={styles.sub}>Gestión automática de beneficiarios y poblaciones diferenciales</p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary" onClick={handlePrint}>
                        🖨 Vista de Impresión
                    </button>
                    <button className="btn btn-secondary" onClick={handleExport}>
                        📥 Descargar Formato
                    </button>
                    <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                        {importing ? 'Cargando...' : '📤 Subir Excel'}
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".xlsx, .xls"
                        onChange={handleImport}
                    />
                    <button className={styles.clearBtn} onClick={clearAll}>
                        🗑 Limpiar Todo
                    </button>
                </div>
            </div>

            <div className={`card ${styles.filters} no-print`}>
                <input 
                    placeholder="🔍 Buscar por nombre o documento..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={styles.searchInput}
                />
                <div className={styles.stats}>
                    Total: <strong>{beneficiarios.length}</strong> beneficiarios
                </div>
            </div>

            <div className="card no-print" style={{ marginTop: 20 }}>
                {loading ? (
                    <div className={styles.loading}>Cargando datos...</div>
                ) : filtered.length === 0 ? (
                    <div className={styles.empty}>No se encontraron registros.</div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Nombre Completo</th>
                                    <th>Doc</th>
                                    <th>Edad</th>
                                    <th>Sexo</th>
                                    <th>Adulto Responsable</th>
                                    <th>Dirección</th>
                                    <th>Contacto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(b => (
                                    <tr key={b.id}>
                                        <td className={styles.nameCell}>{b.nombre_completo}</td>
                                        <td className={styles.docCell}>{b.tipo_doc} {b.documento}</td>
                                        <td className={styles.centerCell}>{b.edad}</td>
                                        <td className={styles.centerCell}>
                                            <button 
                                                className={`${styles.genderBadge} ${b.sexo === 'MUJER' ? styles.genderF : styles.genderM}`}
                                                onClick={() => toggleGender(b.id, b.sexo)}
                                                title="Cambiar sexo"
                                            >
                                                {b.sexo === 'MUJER' ? 'M' : 'H'}
                                            </button>
                                        </td>
                                        <td>{b.adulto_responsable || '—'}</td>
                                        <td>{b.direccion} {b.barrio ? `(${b.barrio})` : ''}</td>
                                        <td className={styles.contactCell}>{b.contacto}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <div className="only-print">
                <AsistenciaPrint beneficiarios={beneficiarios} />
            </div>

            <div className={`${styles.footerNote} no-print`}>
                &bull; El archivo Excel generado contiene el formato institucional del <strong>Municipio de Candelaria</strong> listo para impresión.
            </div>
        </div>
    )
}
