import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { TEMPLATE_B64 } from './templateBase64'

/**
 * Servicio de Excel Institucional (FORMATO F-PSC-FT-621 V7)
 * Carga una plantilla Base64 y la rellena con datos, manteniendo el formato oficial.
 */
export const exportAsistenciaToExcel = async (beneficiarios) => {
    try {
        const DATA_PER_PAGE = 11 // Capacidad exacta de la primera tabla en la V7 (Filas 9 a 19)
        
        // 0. Ordenar beneficiarios alfabéticamente por nombre
        const sortedBeneficiarios = [...beneficiarios].sort((a, b) => 
            (a.nombre_completo || '').localeCompare(b.nombre_completo || '', 'es', { sensitivity: 'base' })
        )

        const totalPages = Math.ceil(sortedBeneficiarios.length / DATA_PER_PAGE) || 1
        
        // 1. Cargar el libro base desde la plantilla
        const workbook = XLSX.read(TEMPLATE_B64, { type: 'base64' })
        const templateSheetName = workbook.SheetNames[0]
        const templateSheet = workbook.Sheets[templateSheetName]

        // 2. Procesar cada página
        for (let p = 0; p < totalPages; p++) {
            const chunk = sortedBeneficiarios.slice(p * DATA_PER_PAGE, (p + 1) * DATA_PER_PAGE)
            const sheetName = `Página ${p + 1}`
            
            // Clonar la hoja de la plantilla para la nueva página
            let currentSheet
            if (p === 0) {
                currentSheet = templateSheet
                workbook.SheetNames[0] = sheetName
                workbook.Sheets[sheetName] = currentSheet
                delete workbook.Sheets[templateSheetName]
            } else {
                currentSheet = JSON.parse(JSON.stringify(templateSheet))
                XLSX.utils.book_append_sheet(workbook, currentSheet, sheetName)
            }

            // 3. Inyectar metadatos (Fecha)
            // Fecha en T4 (Fila 4, Col T -> index 3, 19)
            XLSX.utils.sheet_add_aoa(currentSheet, [[new Date().toLocaleDateString('es-CO')]], { origin: 'T4' })
            
            // 4. Inyectar registros de beneficiarios (Inicia en fila 9 -> origin: 'A9')
            const rows = chunk.map(b => [
                (b.nombre_completo || '').toUpperCase().trim(),
                '', // Col B (Nombre está mergeado A:B en la plantilla)
                String(b.tipo_doc || 'TI').toUpperCase(), // Col C
                b.documento || '', // Col D
                b.edad || '',      // Col E
                (b.sexo === 'MUJER' || b.sexo === 'MUJER') ? 'M' : 'H', // Col F (Sexo)
                b.p_primera_infancia ? 'X' : '', // G
                b.p_infancia ? 'X' : '',         // H
                b.p_adolescencia ? 'X' : '',     // I
                b.p_joven ? 'X' : '',            // J
                b.p_etnia ? 'X' : '',            // K
                b.p_victima ? 'X' : '',          // L
                b.p_lgbti ? 'X' : '',            // M
                b.p_discapacidad ? 'X' : '',     // N
                b.p_religion ? 'X' : '',         // O
                b.p_migrante ? 'X' : '',         // P
                b.p_desvinculado ? 'X' : '',     // Q
                (b.adulto_responsable || '').toUpperCase().trim(), // R
                (b.direccion || '').toUpperCase().trim(),         // S
                (b.corregimiento || '').toUpperCase().trim(),      // T
                (b.barrio || '').toUpperCase().trim(),            // U
                b.contacto || '',                // V
                ''                               // W (Firma)
            ])

            XLSX.utils.sheet_add_aoa(currentSheet, rows, { origin: 'A9' })
        }

        // 5. Generar y descargar el archivo
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
        const finalBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        saveAs(finalBlob, `REPORTE_ASISTENCIA_V7_OFICIAL.xlsx`)

    } catch (err) {
        console.error('Error in template-based export:', err)
        alert('Error: No se pudo generar el reporte oficial. Verifica que la plantilla sea válida.')
    }
}


export const importAsistenciaFromExcel = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const dataRaw = e.target.result
                const workbook = XLSX.read(dataRaw, { type: 'binary' })
                const sheet = workbook.Sheets[workbook.SheetNames[0]]
                const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
                if (!allRows || allRows.length === 0) return resolve([])
                
                let headerIdx = -1
                const columnMap = {}
                const keywords = {
                    nombre_completo: ['nombre', 'beneficiario', 'estudiante'],
                    documento: ['documento', 'identificacion', 'cédula', 'cedula'],
                    tipo_doc: ['tipo', 'td'],
                    edad: ['edad'],
                    sexo: ['sexo', 'genero', 'sx', 'gen', 's', 'm/f', 'h/m', 'sex'],
                    contacto: ['contacto', 'celular', 'telefono', 'tel', 'contacto']
                }

                let bestMatchCount = -1
                for(let i=0; i < Math.min(allRows.length, 30); i++) {
                    const row = (allRows[i]||[]).map(c => String(c||'').toLowerCase().trim())
                    let matchCount = 0
                    const currentMap = {}
                    row.forEach((cell, colIdx) => {
                        for(const [key, kwList] of Object.entries(keywords)) {
                            if(kwList.some(k => {
                                // Para palabras cortas (2 letras o menos) exigir coincidencia exacta
                                if (k.length <= 2) return cell === k;
                                return cell === k || cell.startsWith(k);
                            })) {
                                currentMap[key] = colIdx
                                matchCount++
                                break; // Pasar a la siguiente columna una vez encontrada una coincidencia para esta celda
                            }
                        }
                    })
                    if (matchCount > bestMatchCount && matchCount >= 2) {
                        bestMatchCount = matchCount
                        headerIdx = i
                        Object.assign(columnMap, currentMap)
                    }
                }

                if (headerIdx === -1) throw new Error('No se detectaron columnas necesarias.')

                const dataRows = allRows.slice(headerIdx + 1)
                const processedMap = new Map()
                dataRows.forEach(row => {
                    const docIdx = columnMap['documento']
                    const nameIdx = columnMap['nombre_completo']
                    if (docIdx === undefined || nameIdx === undefined) return
                    const rawDoc = String(row[docIdx] || '').trim()
                    const rawName = String(row[nameIdx] || '').trim()
                    if (!rawDoc || !rawName) return
                    const docClean = rawDoc.replace(/[^0-9kK]/g, '').trim()
                    if (docClean.length < 5) return 

                    const rawSexo = String(row[columnMap['sexo']] || '').trim().toUpperCase();
                    let internalSexo = ''; // Inicialmente vacío para permitir inferencia
                    
                    // Detección agresiva (Orientada a H/M):
                    // Si el valor es M (Mujer), F (Femenino), 2, o empieza con MUJ/FEM
                    const isFemale = rawSexo === 'M' || 
                                   rawSexo === 'F' || 
                                   rawSexo === '2' || 
                                   rawSexo.startsWith('MUJ') || 
                                   rawSexo.startsWith('FEM') ||
                                   rawSexo.includes('FEMENINO') ||
                                   rawSexo.includes('MUJER');

                    const isMale = rawSexo === 'H' || 
                                 rawSexo === '1' || 
                                 rawSexo.startsWith('MAS') || 
                                 rawSexo.startsWith('HOM') || 
                                 rawSexo.includes('MASCULINO') || 
                                 rawSexo.includes('HOMBRE');

                    if (isFemale) {
                        internalSexo = 'MUJER';
                    } else if (isMale) {
                        internalSexo = 'HOMBRE';
                    } else {
                        // FALLBACK: Inferencia por Nombre si el campo Sexo falló
                        internalSexo = inferGenderFromName(rawName) === 'M' ? 'MUJER' : 'HOMBRE';
                    }

                    processedMap.set(docClean, {
                        documento: docClean,
                        nombre_completo: rawName.toUpperCase(),
                        tipo_doc: String(row[columnMap['tipo_doc']] || 'TI').trim().toUpperCase(),
                        edad: parseInt(row[columnMap['edad']]) || null,
                        sexo: internalSexo,
                        contacto: String(row[columnMap['contacto']] || '').trim()
                    })
                })
                resolve(Array.from(processedMap.values()))
            } catch (err) { reject(err) }
        }
        reader.readAsBinaryString(file)
    })
}

/**
 * Inferencia básica de género por nombre (Heurística para Colombia)
 * @param {string} name Nombre completo
 * @returns {string} 'H' o 'M'
 */
function inferGenderFromName(name) {
    const n = String(name || '').toUpperCase().trim();
    if (!n) return 'H';

    // Nombres femeninos muy comunes o partes de nombres
    const femaleNames = [
        'MARIA', 'ANA', 'DANIELA', 'JERALDIN', 'SILVANA', 'ANDREA', 'PAOLA', 'LUZ', 
        'STHEFANY', 'NAILEN', 'SOFIA', 'STEFANIA', 'WILESKA', 'GABRIELA', 'KAROL',
        'ELIZABETH', 'DIANA', 'CLAUDIA', 'MARTHA', 'YULI', 'YULIETH', 'TATIANA', 'VALENTINA'
    ];
    
    if (femaleNames.some(fn => n.includes(fn))) return 'M';

    // Terminación en 'A' (muy común para mujeres, con excepciones como Josué, etc)
    const parts = n.split(/[\s-]/);
    const lastPart = parts[parts.length - 1]; // El último nombre si está en formato APELLIDO-NOMBRE
    if (lastPart && (lastPart.endsWith('A') || lastPart.endsWith('IA') || lastPart.endsWith('NA') || lastPart.endsWith('RA'))) {
        return 'M';
    }

    return 'H';
}
