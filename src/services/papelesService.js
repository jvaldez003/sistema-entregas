import * as XLSX from 'xlsx' // Mantener XLSX solo para la importación (es más ligero para leer)
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { calcularTotalMensual, getColombianHolidays } from './asistenciaExportService'

function parseValorMoneda(val) {
    if (val === null || val === undefined || val === '') return 0
    const n = parseFloat(String(val).replace(/[^\d.]/g, ''))
    return Number.isNaN(n) ? 0 : n
}

const SISBEN_VALIDOS = new Set([
    'Sin SISBEN',
    'A1','A2','A3','A4','A5',
    'B1','B2','B3','B4','B5','B6','B7',
    'C1','C2','C3','C4','C5','C6','C7','C8','C9',
    'C10','C11','C12','C13','C14','C15','C16','C17','C18',
    'D01','D02','D03','D04','D05','D06','D07','D08','D09','D10',
    'D11','D12','D13','D14','D15','D16','D17','D18','D19','D20','D21'
])

function normalizarSisben(raw) {
    if (!raw) return ''
    const limpio = raw.toUpperCase().replace(/\s+/g, '')
    // D1 -> D01, D9 -> D09
    const dMatch = limpio.match(/^D(\d)$/)
    if (dMatch) return `D0${dMatch[1]}`
    return SISBEN_VALIDOS.has(limpio) ? limpio : raw.trim()
}

function formatCOP(amount) {
    return '$ ' + Math.round(amount).toLocaleString('es-CO')
}

function getMesAnioLabel(fechaEntregaStr) {
    if (!fechaEntregaStr) return ''
    const [year, month] = fechaEntregaStr.split('-').map(Number)
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${meses[month - 1]} ${year}`
}

function formatFechaCorta(fechaEntregaStr) {
    if (!fechaEntregaStr) return ''
    const [year, month, day] = fechaEntregaStr.split('-')
    return `${day}/${month}/${year}`
}

function calcularResumenProveedor(list, fechaEntrega) {
    let totalTickets = 0
    let totalValorIda = 0
    let totalValorRegreso = 0

    list.forEach(item => {
        const tickets = calcularTotalMensual(item, fechaEntrega)
        const cantidad = typeof tickets === 'number' ? tickets : 0
        const valorIda = parseValorMoneda(item.valor_ida)
        const valorRegreso = parseValorMoneda(item.valor_regreso)

        totalTickets += cantidad
        totalValorIda += cantidad * valorIda
        totalValorRegreso += cantidad * valorRegreso
    })

    return {
        beneficiarios: list.length,
        totalTickets,
        totalValorIda,
        totalValorRegreso,
        granTotal: totalValorIda + totalValorRegreso
    }
}

function styleSummaryCell(cell, { bold = false, bgColor = null, textColor = 'FF1E293B', size = 11, halign = 'left' } = {}) {
    cell.font = { bold, size, color: { argb: textColor } }
    cell.alignment = { vertical: 'middle', horizontal: halign, wrapText: true }
    cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    }
    if (bgColor) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
    }
}

function appendProveedorMonthlySummary(sheet, list, fechaEntrega, accentColor) {
    if (!list.length || !fechaEntrega) return 0

    const resumen = calcularResumenProveedor(list, fechaEntrega)
    const startRow = list.length + 3
    const summaryColCount = 5
    const mesLabel = getMesAnioLabel(fechaEntrega)
    const year = parseInt(fechaEntrega.split('-')[0], 10)
    const monthKey = fechaEntrega.slice(0, 7)
    const festivosMes = getColombianHolidays(year)
        .filter(h => h.dateString.startsWith(monthKey))
        .map(h => `${h.dateString.split('-')[2]}/${h.dateString.split('-')[1]} — ${h.name}`)

    // Título principal
    sheet.mergeCells(startRow, 1, startRow, summaryColCount)
    const titleCell = sheet.getCell(startRow, 1)
    titleCell.value = `RESUMEN TOTAL MENSUAL — ${mesLabel.toUpperCase()}`
    styleSummaryCell(titleCell, { bold: true, bgColor: accentColor, textColor: 'FFFFFFFF', size: 13, halign: 'center' })
    sheet.getRow(startRow).height = 28

    const infoRows = [
        ['Fecha de entrega de tickets', formatFechaCorta(fechaEntrega)],
        ['Periodo calculado', `Desde ${formatFechaCorta(fechaEntrega)} hasta fin de mes`],
        ['Total tickets mensuales', resumen.totalTickets]
    ]

    infoRows.forEach((rowData, idx) => {
        const r = startRow + 1 + idx
        const row = sheet.getRow(r)
        row.height = 22

        sheet.mergeCells(r, 1, r, 2)
        sheet.mergeCells(r, 3, r, 5)

        const label1 = row.getCell(1)
        label1.value = rowData[0]
        styleSummaryCell(label1, { bold: true, bgColor: 'FFE2E8F0', textColor: 'FF334155', halign: 'left' })

        const val1 = row.getCell(3)
        val1.value = rowData[1]
        styleSummaryCell(val1, { bgColor: idx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF', halign: 'center' })
    })

    // Festivos del mes (si aplica)
    let nextRow = startRow + 4
    if (festivosMes.length > 0) {
        sheet.mergeCells(nextRow, 1, nextRow, summaryColCount)
        const festTitle = sheet.getCell(nextRow, 1)
        festTitle.value = 'Festivos excluidos del cálculo en este mes:'
        styleSummaryCell(festTitle, { bold: true, bgColor: 'FFE0F2FE', textColor: 'FF0369A1', size: 10, halign: 'left' })
        nextRow++

        sheet.mergeCells(nextRow, 1, nextRow, summaryColCount)
        const festList = sheet.getCell(nextRow, 1)
        festList.value = festivosMes.join('  •  ')
        styleSummaryCell(festList, { bgColor: 'FFF0F9FF', textColor: 'FF0C4A6E', size: 9, halign: 'left' })
        sheet.getRow(nextRow).height = Math.min(60, 16 + festivosMes.length * 4)
        nextRow++
    }

    return nextRow - startRow
}

/**
 * Parses the Excel file for document submission.
 * Expected columns: NOMBRE COMPLETO, CÉDULA, CORREO, TELÉFONO, ENTREGÓ PAPELES
 */
export const importPapelesFromExcel = async (file, existingData = []) => {
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
                    nombre_completo: ['nombre', 'completo', 'beneficiario', 'estudiante', 'persona'],
                    cedula: ['cédula', 'cedula', 'identificacion', 'documento', 'cc', 'ti', 'id', 'nro', 'numero'],
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
                    estado_entrega: ['entregó', 'entrego', 'papeles', 'estado'],
                    sisben: ['sisben', 'puntaje sisben', 'puntaje'],
                    ruta_ida: ['ida'],
                    ruta_regreso: ['regreso'],
                    valor_ida: ['valor ida', 'valor_ida'],
                    valor_regreso: ['valor regreso', 'valor_regreso'],
                    valor: ['valor']
                }

                let headerIdx = -1
                for (let i = 0; i < Math.min(allRows.length, 30); i++) {
                    const row = (allRows[i] || []).map(c => String(c || '').toLowerCase().trim())
                    let matchCount = 0
                    const currentMap = {}
                    const valorIndices = []

                    row.forEach((cell, colIdx) => {
                        if (!cell) return;

                        // IDA / REGRESO / VALOR (Mapeo por contenido)
                        if (cell === 'ida' || cell.includes('ruta ida')) {
                            currentMap['ruta_ida'] = colIdx;
                        } else if (cell === 'regreso' || cell.includes('ruta regreso')) {
                            currentMap['ruta_regreso'] = colIdx;
                        } else if (cell.includes('valor')) {
                            if (cell.includes('ida')) currentMap['valor_ida'] = colIdx;
                            else if (cell.includes('regreso')) currentMap['valor_regreso'] = colIdx;
                            else valorIndices.push(colIdx);
                        }

                        // Resto de columnas (Keywords)
                        for (const [key, kwList] of Object.entries(keywords)) {
                            if (kwList.some(k => {
                                if (k.length <= 3) return cell === k; // Coincidencia exacta para ID, CC, TI, U, etc.
                                return cell.includes(k); // Coincidencia parcial para palabras largas (ej: 'nombre' en 'nombre completo')
                            })) {
                                // Solo asignar si no se ha asignado ya
                                if (currentMap[key] === undefined) {
                                    currentMap[key] = colIdx;
                                }
                                break;
                            }
                        }
                    })

                    // El header debe tener al menos Nombre y un Identificador (Cédula/ID/CC)
                    if (currentMap['nombre_completo'] !== undefined && currentMap['cedula'] !== undefined) {
                        headerIdx = i
                        if (valorIndices.length > 0) {
                            if (currentMap['valor_ida'] === undefined) currentMap['valor_ida'] = valorIndices[0];
                            if (currentMap['valor_regreso'] === undefined && valorIndices.length > 1) currentMap['valor_regreso'] = valorIndices[1];
                        }
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

                    const checkDay = (col) => {
                        const val = String(row[columnMap[col]] || '').trim().toLowerCase()
                        return val === 'x' || val === 'sí' || val === 'si' || val === 'true'
                    }

                    const dia_lunes = checkDay('dia_lunes');
                    const dia_martes = checkDay('dia_martes');
                    const dia_miercoles = checkDay('dia_miercoles');
                    const dia_jueves = checkDay('dia_jueves');
                    const dia_viernes = checkDay('dia_viernes');
                    const dia_sabado = checkDay('dia_sabado');

                    const hasDays = [dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes, dia_sabado].some(Boolean);

                    let estadoRaw = String(row[columnMap['estado_entrega']] || '').toUpperCase()
                    let estado = ''

                    if (estadoRaw.includes('SÍ') || estadoRaw.includes('SI') || estadoRaw.includes('✓')) {
                        estado = 'SÍ ENTREGÓ'
                    } else if (estadoRaw.includes('APLICA') && !estadoRaw.includes('NO')) {
                        estado = 'APLICA'
                    } else if (estadoRaw.includes('NO APLICA')) {
                        estado = 'NO APLICA'
                    } else {
                        // Si no hay estado explícito, inferir por días
                        estado = hasDays ? 'SÍ ENTREGÓ' : 'NO ENTREGÓ'
                    }

                    // Regla de negocio solicitada: Si no hay días, forzar a NO ENTREGÓ
                    if (!hasDays) {
                        estado = 'NO ENTREGÓ'
                    }

                    const itemData = {
                        nombre_completo: nombre.toUpperCase(),
                        cedula: String(cedula),
                        correo: String(row[columnMap['correo']] || '').trim().toLowerCase(),
                        telefono: String(row[columnMap['telefono']] || '').trim(),
                        residencia: String(row[columnMap['residencia']] || '').trim(),
                        destino: String(row[columnMap['destino']] || '').trim(),
                        universidad: String(row[columnMap['universidad']] || '').trim(),
                        horario: String(row[columnMap['horario']] || '').trim(),
                        ruta: String(row[columnMap['ruta']] || '').trim(),
                        dia_lunes,
                        dia_martes,
                        dia_miercoles,
                        dia_jueves,
                        dia_viernes,
                        dia_sabado,
                        estado_entrega: estado,
                        ruta_ida: String(row[columnMap['ruta_ida']] || '').trim(),
                        valor_ida: String(row[columnMap['valor_ida']] || '').trim(),
                        ruta_regreso: String(row[columnMap['ruta_regreso']] || '').trim(),
                        valor_regreso: String(row[columnMap['valor_regreso']] || '').trim(),
                        sisben: normalizarSisben(String(row[columnMap['sisben']] || '').trim())
                    };

                    // Auto-generar rutas si faltan, aplicando la regla de "CANDELARIA"
                    if (!itemData.ruta_ida && itemData.residencia && itemData.destino) {
                        const resNorm = itemData.residencia.toLowerCase().trim() === 'cabecera municipal' ? 'CANDELARIA' : itemData.residencia.toUpperCase();
                        const destNorm = itemData.destino.toLowerCase().trim() === 'cabecera municipal' ? 'CANDELARIA' : itemData.destino.toUpperCase();
                        itemData.ruta_ida = `${resNorm} - ${destNorm}`;
                        itemData.ruta_regreso = `${destNorm} - ${resNorm}`;
                    }

                    // Auto-completar valores faltantes desde la base de datos local (existingData)
                    if (!itemData.valor_ida && itemData.residencia && itemData.destino) {
                        const match = existingData.find(d => 
                            (d.residencia || '').toUpperCase() === itemData.residencia.toUpperCase() &&
                            (d.destino || '').toUpperCase() === itemData.destino.toUpperCase() &&
                            d.valor_ida
                        );
                        if (match) {
                            itemData.valor_ida = match.valor_ida;
                            itemData.valor_regreso = match.valor_regreso || match.valor_ida;
                        }
                    }

                    results.push(itemData)
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
export const exportPapelesToExcel = async (data, fechaEntrega, ticketData = {}) => {
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
        { header: 'SISBEN', key: 'sisben', width: 15 },
        // { header: 'HORARIO', key: 'horario', width: 20 },
        // { header: 'RUTA', key: 'ruta', width: 15 },
        { header: 'LUNES', key: 'dia_lunes', width: 10 },
        { header: 'MARTES', key: 'dia_martes', width: 10 },
        { header: 'MIERCOLES', key: 'dia_miercoles', width: 12 },
        { header: 'JUEVES', key: 'dia_jueves', width: 10 },
        { header: 'VIERNES', key: 'dia_viernes', width: 10 },
        { header: 'SABADO', key: 'dia_sabado', width: 10 },
        { header: 'TOTAL SEMANAL', key: 'total_semanal', width: 15 },
        { header: 'TOTAL MENSUAL', key: 'total_mensual', width: 15 },
        { header: 'ENTREGÓ PAPELES', key: 'estado', width: 25 },
        { header: 'RECOGIÓ TICKET', key: 'recogio_ticket', width: 18 },
        { header: 'NOVEDADES / OBSERVACIONES', key: 'novedad_observacion', width: 40 },
        { header: 'IDA', key: 'ruta_ida', width: 25 },
        { header: 'VALOR IDA', key: 'valor_ida', width: 15 },
        { header: 'REGRESO', key: 'ruta_regreso', width: 25 },
        { header: 'VALOR REGRESO', key: 'valor_regreso', width: 15 }
    ];

    const addSheet = (name, list, colorHex, options = {}) => {
        const { includeEstado = true, cleanFormat = false, monthlySummary = false } = options;
        const sheet = workbook.addWorksheet(name);
        
        let currentColumns = columns;
        if (!includeEstado) {
            currentColumns = currentColumns.filter(col => col.key !== 'estado');
        }
        if (cleanFormat) {
            currentColumns = currentColumns.filter(col => col.key !== 'novedad_observacion');
        }
        sheet.columns = currentColumns;

        // Añadir datos
        list.forEach((item, i) => {
            const totalSemanal = [
                item.dia_lunes, item.dia_martes, item.dia_miercoles,
                item.dia_jueves, item.dia_viernes, item.dia_sabado
            ].filter(Boolean).length;
            
            const totalMensualReal = calcularTotalMensual(item, fechaEntrega);

            const rowData = {
                idx: i + 1,
                nombre: (item.nombre_completo || '').toUpperCase(),
                cedula: item.cedula,
                correo: item.correo,
                telefono: item.telefono,
                residencia: (item.residencia || '').toUpperCase(),
                destino: (item.destino || '').toUpperCase(),
                universidad: (item.universidad || '').toUpperCase(),
                sisben: item.sisben || '',
                horario: item.horario || '',
                ruta: (item.ruta || '').toUpperCase(),
                dia_lunes: item.dia_lunes ? 'X' : '',
                dia_martes: item.dia_martes ? 'X' : '',
                dia_miercoles: item.dia_miercoles ? 'X' : '',
                dia_jueves: item.dia_jueves ? 'X' : '',
                dia_viernes: item.dia_viernes ? 'X' : '',
                dia_sabado: item.dia_sabado ? 'X' : '',
                total_semanal: totalSemanal > 0 ? totalSemanal : '',
                total_mensual: totalMensualReal !== '' && totalMensualReal > 0 ? totalMensualReal : (totalSemanal > 0 ? (totalSemanal * 4) : ''),
                recogio_ticket: ticketData[item.cedula] === false ? 'NO RECOGIÓ' : (ticketData[item.cedula] === true ? 'SÍ RECOGIÓ' : ''),
                ruta_ida: (item.ruta_ida || '').toUpperCase(),
                valor_ida: item.valor_ida || '',
                ruta_regreso: (item.ruta_regreso || '').toUpperCase(),
                valor_regreso: item.valor_regreso || ''
            };

            if (includeEstado) {
                rowData.estado = item.estado_entrega;
            }
            if (!cleanFormat) {
                rowData.novedad_observacion = item.novedad_observacion || '';
            }

            const row = sheet.addRow(rowData);

            // Determinar color de la fila según novedades (Prioridad)
            let rowBgColor = null;
            let textColor = 'FF000000';

            if (!cleanFormat) {
                if (item.is_replacement) {
                    rowBgColor = 'FFFFF9C4'; // Amarillo claro
                    textColor = 'FF856404';  // Marrón oscuro
                } else if (item.days_added_later) {
                    rowBgColor = 'FFB3E5FC'; // Azul claro
                    textColor = 'FF01579B';  // Azul oscuro
                } else if (item.is_new) {
                    rowBgColor = 'FFC8E6C9'; // Verde claro
                    textColor = 'FF256029';  // Verde oscuro
                } else if (item.novedad_observacion && item.novedad_observacion.trim() !== '') {
                    rowBgColor = 'FFFFCC80'; // Naranja claro
                    textColor = 'FFBF360C';  // Naranja oscuro
                } else if (includeEstado) {
                    const estado = item.estado_entrega;
                    if (estado === 'SÍ ENTREGÓ') {
                        rowBgColor = 'FFC6EFCE'; // Verde
                        textColor = 'FF006100';
                    } else if (estado === 'NO ENTREGÓ') {
                        rowBgColor = 'FFFFC7CE'; // Rojo
                        textColor = 'FF9C0006';
                    }
                }
            }

            // Aplicar estilos a cada celda de la fila recién creada
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { vertical: 'middle', wrapText: true };
                
                const colKey = currentColumns[colNumber - 1]?.key || '';
                if (colKey === 'idx' || colKey === 'cedula' || colKey.startsWith('dia_') || colKey.startsWith('total_') || colKey === 'estado') {
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                }

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

        // --- RESUMEN TOTAL MENSUAL (hojas proveedor) ---
        let summaryRowsUsed = 0;
        if (monthlySummary && list.length > 0) {
            summaryRowsUsed = appendProveedorMonthlySummary(sheet, list, fechaEntrega, colorHex, currentColumns.length);
        }

        // --- AGREGAR LEYENDA DE COLORES AL FINAL ---
        if (!cleanFormat) {
            const lastDataRow = list.length + 1;
            const legendStartRow = lastDataRow + 3 + (summaryRowsUsed > 0 ? summaryRowsUsed + 1 : 0);

            const legendData = [
                { label: 'LEYENDA DE COLORES Y NOVEDADES', color: 'FF4A5568', textColor: 'FFFFFFFF', bold: true },
                { label: 'AMARILLO: El registro fue reemplazado por otra persona.', color: 'FFFFF9C4', textColor: 'FF856404' },
                { label: 'AZUL CLARO: Se activaron días de viaje después de la carga inicial.', color: 'FFB3E5FC', textColor: 'FF01579B' },
                { label: 'VERDE CLARO: Registro nuevo (agregado manualmente).', color: 'FFC8E6C9', textColor: 'FF256029' },
                { label: 'NARANJA: El registro tiene una observación de novedad manual.', color: 'FFFFCC80', textColor: 'FFBF360C' },
                { label: 'VERDE: El estudiante entregó papeles correctamente.', color: 'FFC6EFCE', textColor: 'FF006100' },
                { label: 'ROJO: El estudiante NO ha entregado papeles.', color: 'FFFFC7CE', textColor: 'FF9C0006' }
            ];

            legendData.forEach((item, idx) => {
                const row = sheet.getRow(legendStartRow + idx);
                const cell = row.getCell(2); // Columna B
                cell.value = item.label;
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: item.color }
                };
                cell.font = {
                    bold: item.bold || false,
                    color: { argb: item.textColor },
                    size: 10
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                // Unir un par de celdas para que se vea mejor la leyenda
                sheet.mergeCells(legendStartRow + idx, 2, legendStartRow + idx, 4);
            });
        }

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

        // Encontrar la columna 'universidad' para aplicar el filtro hasta ahí
        const lastFilterColIndex = currentColumns.findIndex(col => col.key === 'universidad') + 1;
        const finalFilterCol = lastFilterColIndex > 0 ? lastFilterColIndex : currentColumns.length;

        // Agregar filtro automático a las columnas de información principal (excluyendo días y totales)
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: list.length === 0 ? 1 : list.length + 1, column: finalFilterCol }
        };
    };

    // Filtrar datos para el proveedor (solo los que tienen días de viaje asignados y destino)
    const dataProveedor = data.filter(d => {
        const tieneDias = d.dia_lunes || d.dia_martes || d.dia_miercoles || d.dia_jueves || d.dia_viernes || d.dia_sabado;
        return tieneDias && d.destino && d.destino.trim() !== '';
    });

    // Crear las 4 hojas originales con colores corporativos
    addSheet('PROVEEDOR TICKETS (LIMPIO)', dataProveedor, 'FFD97706', { includeEstado: false, cleanFormat: true, monthlySummary: true }); // Naranja
    addSheet('PROVEEDOR TICKETS (NOVEDADES)', dataProveedor, 'FFF59E0B', { includeEstado: false, cleanFormat: false, monthlySummary: true }); // Amarillo Naranja
    addSheet('GENERAL - TODOS', data, 'FF2B6CB0'); // Azul
    addSheet('ENTREGARON PAPELES', data.filter(d => d.estado_entrega === 'SÍ ENTREGÓ'), 'FF2F855A'); // Verde
    addSheet('NO ENTREGARON PAPELES', data.filter(d => d.estado_entrega === 'NO ENTREGÓ'), 'FFC53030'); // Rojo

    // Nuevas hojas de Auditoría de Novedades
    const reemplazos = data.filter(d => d.is_replacement);
    const diasAgregados = data.filter(d => d.days_added_later);
    const nuevos = data.filter(d => d.is_new);
    const conObservacion = data.filter(d => d.novedad_observacion && d.novedad_observacion.trim() !== '');
    const resumenNovedades = data.filter(d => 
        d.is_replacement || 
        d.days_added_later || 
        d.is_new || 
        (d.novedad_observacion && d.novedad_observacion.trim() !== '')
    );

    if (reemplazos.length > 0) addSheet('REEMPLAZOS', reemplazos, 'FFFBC02D'); // Amarillo oscuro
    if (diasAgregados.length > 0) addSheet('DÍAS ADICIONADOS', diasAgregados, 'FF0288D1'); // Azul
    if (nuevos.length > 0) addSheet('REGISTROS NUEVOS', nuevos, 'FF388E3C'); // Verde oscuro
    if (conObservacion.length > 0) addSheet('OBSERVACIONES MANUALES', conObservacion, 'FFFFA726'); // Naranja
    if (resumenNovedades.length > 0) addSheet('RESUMEN NOVEDADES', resumenNovedades, 'FFE65100'); // Naranja oscuro

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `REPORTE_DOCUMENTACION_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Genera un archivo CSV optimizado para importar masivamente contactos a WhatsApp/Google Contacts.
 * Extrae solo el primer número de teléfono y añade una etiqueta de grupo.
 */
export const exportContactosToCSV = (data) => {
    // Encabezados estándar que Google Contacts reconoce para importar contactos con etiquetas
    const header = "Name,Group Membership,Phone 1 - Value\n";
    
    const rows = data.map(item => {
        let phone = '';
        if (item.telefono) {
            // Extraer solo el primer número de teléfono (separadores comunes)
            const parts = item.telefono.split(/[-/,|\s]/);
            const firstPart = parts.find(p => p.replace(/\D/g, '').length >= 7) || parts[0];
            phone = firstPart.replace(/\D/g, ''); // Dejar solo números
            
            // Añadir código de país si es un celular estándar de 10 dígitos (Colombia)
            if (phone.length === 10) {
                phone = `+57${phone}`;
            } else if (phone.length === 12 && phone.startsWith('57')) {
                phone = `+${phone}`;
            }
        }
        
        // Etiqueta para que queden agrupados masivamente
        const group = "Beneficiarios Transporte";
        
        // Escapar comillas en el nombre
        const name = `"${(item.nombre_completo || '').replace(/"/g, '""')}"`;
        
        return `${name},${group},${phone}`;
    });
    
    // Filtrar los que no tienen número de teléfono para evitar contactos vacíos
    const validRows = rows.filter(row => row.split(',')[2].length > 0);
    
    const csvContent = header + validRows.join('\n');
    // Usar BOM (\ufeff) para que Excel y otras herramientas abran el CSV con UTF-8 correcto
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    saveAs(blob, `Contactos_WhatsApp_${new Date().toISOString().slice(0, 10)}.csv`);
};
