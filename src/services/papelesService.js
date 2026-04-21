import * as XLSX from 'xlsx' // Mantener XLSX solo para la importación (es más ligero para leer)
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

/**
 * Parses the Excel file for document submission.
 * Expected columns: NOMBRE COMPLETO, CÉDULA, CORREO, TELÉFONO, ENTREGÓ PAPELES
 */
export const importPapelesFromExcel = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const dataRaw = e.target.result
                const workbook = XLSX.read(dataRaw, { type: 'binary' })
                const sheet = workbook.Sheets[workbook.SheetNames[0]]
                const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
                if (!allRows || allRows.length === 0) return resolve([])

                // Map columns
                const columnMap = {}
                const keywords = {
                    nombre_completo: ['nombre', 'completo', 'beneficiario', 'estudiante'],
                    cedula: ['cédula', 'cedula', 'identificacion', 'documento', 'cc', 'ti'],
                    correo: ['correo', 'email', 'e-mail'],
                    telefono: ['teléfono', 'telefono', 'celular', 'tel'],
                    estado_entrega: ['entregó', 'entrego', 'papeles', 'estado']
                }

                let headerIdx = -1
                for (let i = 0; i < Math.min(allRows.length, 30); i++) {
                    const row = (allRows[i] || []).map(c => String(c || '').toLowerCase().trim())
                    let matchCount = 0
                    const currentMap = {}
                    row.forEach((cell, colIdx) => {
                        for (const [key, kwList] of Object.entries(keywords)) {
                            if (kwList.some(k => cell.includes(k))) {
                                currentMap[key] = colIdx
                                matchCount++
                                break
                            }
                        }
                    })
                    if (matchCount >= 2) {
                        headerIdx = i
                        Object.assign(columnMap, currentMap)
                        break
                    }
                }

                if (headerIdx === -1) throw new Error('No se detectaron las columnas necesarias (Nombre, Cédula).')

                const dataRows = allRows.slice(headerIdx + 1)
                const results = []
                dataRows.forEach(row => {
                    const nombre = String(row[columnMap['nombre_completo']] || '').trim()
                    const cedula = String(row[columnMap['cedula']] || '').trim()
                    if (!nombre || !cedula) return

                    let estadoRaw = String(row[columnMap['estado_entrega']] || '').toUpperCase()
                    let estado = 'NO ENTREGÓ'
                    if (estadoRaw.includes('SÍ') || estadoRaw.includes('SI') || estadoRaw.includes('✓')) estado = 'SÍ ENTREGÓ'
                    else if (estadoRaw.includes('APLICA') && !estadoRaw.includes('NO')) estado = 'APLICA'
                    else if (estadoRaw.includes('NO APLICA')) estado = 'NO APLICA'

                    results.push({
                        nombre_completo: nombre.toUpperCase(),
                        cedula: String(cedula),
                        correo: String(row[columnMap['correo']] || '').trim().toLowerCase(),
                        telefono: String(row[columnMap['telefono']] || '').trim(),
                        estado_entrega: estado
                    })
                })
                resolve(results)
            } catch (err) { reject(err) }
        }
        reader.readAsBinaryString(file)
    })
}

/**
 * Generates an Excel file with 3 sheets using ExcelJS for premium styling.
 */
export const exportPapelesToExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    
    const columns = [
        { header: 'No.', key: 'idx', width: 8 },
        { header: 'NOMBRE COMPLETO', key: 'nombre', width: 40 },
        { header: 'CÉDULA', key: 'cedula', width: 20 },
        { header: 'CORREO', key: 'correo', width: 30 },
        { header: 'TELÉFONO', key: 'telefono', width: 20 },
        { header: 'ENTREGÓ PAPELES', key: 'estado', width: 25 }
    ];

    const addSheet = (name, list, colorHex) => {
        const sheet = workbook.addWorksheet(name);
        sheet.columns = columns;

        // Añadir datos
        list.forEach((item, i) => {
            sheet.addRow({
                idx: i + 1,
                nombre: item.nombre_completo,
                cedula: item.cedula,
                correo: item.correo,
                telefono: item.telefono,
                estado: item.estado_entrega
            });
        });

        // Estilo del Header
        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colorHex }
            };
            cell.font = {
                bold: true,
                color: { argb: 'FFFFFFFF' },
                size: 12
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Estilo de las filas de datos
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.alignment = { vertical: 'middle' };
                    if (cell.col === 1 || cell.col === 3 || cell.col === 6) {
                        cell.alignment = { horizontal: 'center' };
                    }
                });
            }
        });

        // Auto-ajustar ancho de columnas basado en el contenido
        sheet.columns.forEach(column => {
            let maxColumnLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 0;
                if (columnLength > maxColumnLength) {
                    maxColumnLength = columnLength;
                }
            });
            column.width = maxColumnLength < 10 ? 10 : maxColumnLength + 5;
        });
    };

    // Crear las 3 hojas con colores corporativos
    addSheet('GENERAL - TODOS', data, 'FF2B6CB0'); // Azul
    addSheet('ENTREGARON PAPELES', data.filter(d => d.estado_entrega === 'SÍ ENTREGÓ'), 'FF2F855A'); // Verde
    addSheet('NO ENTREGARON PAPELES', data.filter(d => d.estado_entrega === 'NO ENTREGÓ'), 'FFC53030'); // Rojo

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `REPORTE_DOCUMENTACION_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
