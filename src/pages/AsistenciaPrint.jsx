import React from 'react'
import styles from './AsistenciaPage.module.css'

const AsistenciaPrint = ({ beneficiarios }) => {
    const DATA_PER_PAGE = 12
    const totalPages = Math.ceil(beneficiarios.length / DATA_PER_PAGE) || 1
    
    const pages = []
    for (let i = 0; i < totalPages; i++) {
        pages.push(beneficiarios.slice(i * DATA_PER_PAGE, (i + 1) * DATA_PER_PAGE))
    }

    return (
        <div className="print-only">
            {pages.map((chunk, pageIdx) => (
                <div key={pageIdx} className={styles.printPage}>
                    <div className={styles.printContainer}>
                        {/* ENCABEZADO TRIPLE (ESCUDO | TITULO | VERSION) */}
                        <table className={styles.headerTable}>
                            <tbody>
                                <tr>
                                    <td rowSpan="2" className={styles.logoCell}>
                                        <div className={styles.logoPlaceholder}>
                                            <img src="/logo_candelaria.png" alt="Escudo" onError={(e) => e.target.style.display='none'} style={{width:'60px'}} />
                                            <div style={{fontSize:'8px'}}>ESCUDO</div>
                                        </div>
                                    </td>
                                    <td className={styles.titleCell}>
                                        MUNICIPIO DE CANDELARIA
                                    </td>
                                    <td className={styles.versionCell}>
                                        Código: 54-PSC-FT-621<br/>
                                        Fecha: 18-Nov-2024<br/>
                                        Versión: 7<br/>
                                        Página {pageIdx + 1} de {totalPages}
                                    </td>
                                </tr>
                                <tr>
                                    <td className={styles.titleCell} style={{fontSize:'11px'}}>
                                        LISTADO DE ASISTENCIA CON PRIMERA INFANCIA, INFANCIA, ADOLESCENCIA Y ACOMPAÑAMIENTO FAMILIAR
                                    </td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>

                        {/* SUB-HEADER (FECHA/LUGAR/PROYECTO) */}
                        <table className={styles.subHeaderTable}>
                            <tbody>
                                <tr>
                                    <td style={{width:'30%'}}>FECHA: {new Date().toLocaleDateString('es-CO')}</td>
                                    <td style={{width:'70%'}}>PROYECTO: __________________________________________________________________________</td>
                                </tr>
                                <tr>
                                    <td>LUGAR DE ATENCIÓN: _________________________</td>
                                    <td>NOMBRE DE LA ACTIVIDAD: _________________________________________________________________</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* TABLA DE DATOS (22 COLUMNAS) */}
                        <table className={styles.printTable}>
                            <thead>
                                <tr>
                                    <th rowSpan="2" style={{width:'180px'}}>NOMBRES Y APELLIDOS DEL NIÑO O NIÑA</th>
                                    <th rowSpan="2" style={{width:'25px'}}>TIPO</th>
                                    <th rowSpan="2" style={{width:'70px'}}>DOCUMENTO</th>
                                    <th rowSpan="2" style={{width:'25px'}}>EDAD</th>
                                    <th colSpan="12">POBLACIONES DIFERENCIALES</th>
                                    <th rowSpan="2" style={{width:'100px'}}>ADULTO RESPONSABLE</th>
                                    <th rowSpan="2" style={{width:'80px'}}>DIRECCIÓN / BARRIO</th>
                                    <th rowSpan="2" style={{width:'60px'}}>CONTACTO</th>
                                    <th rowSpan="2" style={{width:'80px'}}>FIRMA</th>
                                </tr>
                                <tr className={styles.subHeader}>
                                    <th>Sx</th>
                                    <th>PI</th>
                                    <th>Inf</th>
                                    <th>Ad</th>
                                    <th>Jo</th>
                                    <th>Et</th>
                                    <th>Ví</th>
                                    <th>LG</th>
                                    <th>Di</th>
                                    <th>Re</th>
                                    <th>Mi</th>
                                    <th>Pr</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chunk.map((b, idx) => (
                                    <tr key={idx}>
                                        <td className={styles.textLeft}>{b.nombre_completo}</td>
                                        <td>{b.tipo_doc || 'TI'}</td>
                                        <td>{b.documento}</td>
                                        <td>{b.edad}</td>
                                        <td>{(b.sexo === 'MUJER' || b.sexo === 'F') ? 'M' : 'H'}</td>
                                        <td>{b.p_primera_infancia ? 'X' : ''}</td>
                                        <td>{b.p_infancia ? 'X' : ''}</td>
                                        <td>{b.p_adolescencia ? 'X' : ''}</td>
                                        <td>{b.p_joven ? 'X' : ''}</td>
                                        <td>{b.p_etnia ? 'X' : ''}</td>
                                        <td>{b.p_victima ? 'X' : ''}</td>
                                        <td>{b.p_lgbti ? 'X' : ''}</td>
                                        <td>{b.p_discapacidad ? 'X' : ''}</td>
                                        <td>{b.p_religion ? 'X' : ''}</td>
                                        <td>{b.p_migrante ? 'X' : ''}</td>
                                        <td>{b.p_desvinculado ? 'X' : ''}</td>
                                        <td className={styles.textLeft} style={{fontSize:'7px'}}>{b.adulto_responsable}</td>
                                        <td className={styles.textLeft} style={{fontSize:'7px'}}>{b.direccion || b.barrio}</td>
                                        <td>{b.contacto}</td>
                                        <td></td>
                                    </tr>
                                ))}
                                {/* Filas vacías hasta completar 12 */}
                                {Array.from({ length: DATA_PER_PAGE - chunk.length }).map((_, i) => (
                                    <tr key={`empty-${i}`}>
                                        {Array.from({ length: 22 }).map((__, j) => <td key={j}>&nbsp;</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* PIE DE PÁGINA (FIRMA Y LEGAL) */}
                        <div className={styles.printFooter}>
                            <div className={styles.signatureLine}>
                                FIRMA DEL FUNCIONARIO: __________________________________________________________________________
                            </div>
                            <div className={styles.legalNotice}>
                                *Los asistentes aquí registrados autorizan el tratamiento de datos personales de acuerdo con la Ley 1581 de 2012 y el consentimiento institucional para toma de registros audiovisuales.
                                Municipio de Candelaria - Valle del Cauca. Formato F-PSC-FT-621 V7.
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default AsistenciaPrint
