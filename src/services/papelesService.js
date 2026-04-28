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
                    residencia: ['residencia', 'barrio', 'direccion', 'dirección'],
                    destino: ['destino', 'lugar'],
                    universidad: ['universidad', 'u', 'estudio', 'institucion'],
                    horario: ['horario', 'hora'],
                    ruta: ['ruta', 'bus'],
                    dia_lunes: ['lunes'],
                    dia_martes: ['martes'],
                    dia_miercoles: ['miercoles', 'miércoles'],
                    dia_jueves: ['jueves'],
                    dia_viernes: ['viernes'],
                    dia_sabado: ['sabado', 'sábado'],
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

                    const checkDay = (col) => {
                        const val = String(row[columnMap[col]] || '').trim().toLowerCase()
                        return val === 'x' || val === 'sí' || val === 'si' || val === 'true'
                    }

                    results.push({
                        nombre_completo: nombre.toUpperCase(),
                        cedula: String(cedula),
                        correo: String(row[columnMap['correo']] || '').trim().toLowerCase(),
                        telefono: String(row[columnMap['telefono']] || '').trim(),
                        residencia: String(row[columnMap['residencia']] || '').trim(),
                        destino: String(row[columnMap['destino']] || '').trim(),
                        universidad: String(row[columnMap['universidad']] || '').trim(),
                        horario: String(row[columnMap['horario']] || '').trim(),
                        ruta: String(row[columnMap['ruta']] || '').trim(),
                        dia_lunes: checkDay('dia_lunes'),
                        dia_martes: checkDay('dia_martes'),
                        dia_miercoles: checkDay('dia_miercoles'),
                        dia_jueves: checkDay('dia_jueves'),
                        dia_viernes: checkDay('dia_viernes'),
                        dia_sabado: checkDay('dia_sabado'),
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
        { header: 'RESIDENCIA', key: 'residencia', width: 25 },
        { header: 'DESTINO', key: 'destino', width: 25 },
        { header: 'UNIVERSIDAD', key: 'universidad', width: 25 },
        { header: 'HORARIO', key: 'horario', width: 20 },
        { header: 'RUTA', key: 'ruta', width: 15 },
        { header: 'LUNES', key: 'dia_lunes', width: 10 },
        { header: 'MARTES', key: 'dia_martes', width: 10 },
        { header: 'MIERCOLES', key: 'dia_miercoles', width: 12 },
        { header: 'JUEVES', key: 'dia_jueves', width: 10 },
        { header: 'VIERNES', key: 'dia_viernes', width: 10 },
        { header: 'SABADO', key: 'dia_sabado', width: 10 },
        { header: 'TOTAL SEMANAL', key: 'total_semanal', width: 15 },
        { header: 'TOTAL MENSUAL', key: 'total_mensual', width: 15 },
        { header: 'ENTREGÓ PAPELES', key: 'estado', width: 25 }
    ];

    const addSheet = (name, list, colorHex) => {
        const sheet = workbook.addWorksheet(name);
        sheet.columns = columns;

        // Añadir datos
        list.forEach((item, i) => {
            const totalSemanal = [
                item.dia_lunes, item.dia_martes, item.dia_miercoles,
                item.dia_jueves, item.dia_viernes, item.dia_sabado
            ].filter(Boolean).length;

            sheet.addRow({
                idx: i + 1,
                nombre: item.nombre_completo,
                cedula: item.cedula,
                correo: item.correo,
                telefono: item.telefono,
                residencia: item.residencia || '',
                destino: item.destino || '',
                universidad: item.universidad || '',
                horario: item.horario || '',
                ruta: item.ruta || '',
                dia_lunes: item.dia_lunes ? 'X' : '',
                dia_martes: item.dia_martes ? 'X' : '',
                dia_miercoles: item.dia_miercoles ? 'X' : '',
                dia_jueves: item.dia_jueves ? 'X' : '',
                dia_viernes: item.dia_viernes ? 'X' : '',
                dia_sabado: item.dia_sabado ? 'X' : '',
                total_semanal: totalSemanal > 0 ? totalSemanal : '',
                total_mensual: totalSemanal > 0 ? (totalSemanal * 4) : '',
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
                const estado = row.getCell('estado').value;
                
                let rowBgColor = null;
                let textColor = 'FF000000';

                if (estado === 'SÍ ENTREGÓ') {
                    rowBgColor = 'FFC6EFCE'; // Verde claro (Estilo Excel "Bueno")
                    textColor = 'FF006100';  // Texto verde oscuro
                } else if (estado === 'NO ENTREGÓ') {
                    rowBgColor = 'FFFFC7CE'; // Rojo claro (Estilo Excel "Malo")
                    textColor = 'FF9C0006';  // Texto rojo oscuro
                }

                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.alignment = { vertical: 'middle' };
                    
                    // Alinear al centro columnas específicas (No, Cédula, Días, Totales, Estado)
                    if (cell.col === 1 || cell.col === 3 || (cell.col >= 10 && cell.col <= 18)) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }

                    // Aplicar colores según el estado
                    if (rowBgColor) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: rowBgColor }
                        };
                        cell.font = { 
                            color: { argb: textColor },
                            size: 11
                        };
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
