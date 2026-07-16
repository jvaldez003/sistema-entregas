import * as XLSX from 'xlsx' // Mantener XLSX solo para la importación (es más ligero para leer)
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { calcularTotalMensual, getColombianHolidays } from './asistenciaExportService'

function parseValorMoneda(val) {
    if (val === null || val === undefined || val === '') return 0
    const n = parseFloat(String(val).replace(/[^\d.]/g, ''))
    return Number.isNaN(n) ? 0 : n
}

/** Normaliza origen/destino para cruzar con el tarifario oficial. */
export function normalizarLugarRuta(raw) {
    if (!raw) return ''
    let t = String(raw)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[–—−]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()

    if (t === 'CABECERA MUNICIPAL' || t === 'CANDELARIA') return 'CANDELARIA'
    if (t.includes('POBLADO') || t.includes('CAMPESTRE') || t.includes('COMUNIDAD CAMPESTRE')) return 'POBLADO CAMPESTRE'
    if (t.includes('SAN JOAQUIN')) return 'SAN JOAQUIN'
    if (t.includes('VILLAGORGONA')) return 'VILLAGORGONA'
    if (t.includes('EL LAURO') || t === 'LAURO') return 'EL LAURO'
    if (t.includes('PALMIRA')) return 'PALMIRA'
    if (t === 'CALI' || t.startsWith('CALI ') || t.includes('TIPLE CALI')) return 'CALI'
    if (t.includes('CANDELARIA')) return 'CANDELARIA'
    return t
}

/**
 * Tarifario oficial transporte universitario (valor unitario ida/regreso).
 * Las rutas que no estén aquí se dejan como están.
 */
export const TARIFAS_RUTAS_OFICIALES = {
    'CANDELARIA|CALI': 7750,
    'CANDELARIA|PALMIRA': 6650,
    'VILLAGORGONA|CALI': 5000,
    'VILLAGORGONA|PALMIRA': 7250,
    'POBLADO CAMPESTRE|CALI': 4150,
    'POBLADO CAMPESTRE|PALMIRA': 8300,
    'SAN JOAQUIN|CALI': 4300,
    'SAN JOAQUIN|PALMIRA': 8550,
    'EL LAURO|CALI': 8100,
    'VILLAGORGONA|CANDELARIA': 3000,
}

/** Devuelve el valor oficial (string) o null si la ruta no está en el tarifario. */
export function resolverTarifaOficial(residencia, destino) {
    const origen = normalizarLugarRuta(residencia)
    const dest = normalizarLugarRuta(destino)
    if (!origen || !dest) return null
    const precio = TARIFAS_RUTAS_OFICIALES[`${origen}|${dest}`]
    return precio != null ? String(precio) : null
}

/** Aplica tarifas oficiales a un registro; si no hay match, conserva valores actuales. */
export function aplicarTarifaOficialAItem(item) {
    if (!item) return item
    const tarifa = resolverTarifaOficial(item.residencia, item.destino)
    if (!tarifa) return item
    return {
        ...item,
        valor_ida: tarifa,
        valor_regreso: tarifa,
    }
}

export function aplicarTarifasOficiales(list = []) {
    return (list || []).map(aplicarTarifaOficialAItem)
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

/** Unifica guiones/espacios para que el filtro de Excel no muestre duplicados. */
function normalizarTextoParaExcel(raw) {
    if (!raw) return ''
    return String(raw)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // quitar tildes para unificar
        .replace(/[–—−‐‑]/g, '-') // en-dash, em-dash, minus → guion normal
        .replace(/\s*-\s*/g, ' - ')
        .replace(/\s+/g, ' ')
        .trim()
}

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

function appendProveedorMonthlySummary(sheet, list, fechaEntrega, accentColor, startRowOverride = null) {
    if (!list.length || !fechaEntrega) return 0

    const resumen = calcularResumenProveedor(list, fechaEntrega)
    const startRow = startRowOverride ?? (list.length + 3)
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

function styleHeaderCell(cell, { bgColor, textColor = 'FFFFFFFF', bold = true } = {}) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
    cell.font = { bold, color: { argb: textColor }, size: 10 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    }
}

function parseDateOnly(dateStr) {
    if (!dateStr) return null
    const s = String(dateStr).trim()
    // Esperado: YYYY-MM-DD
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) return null
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null
    const dt = new Date(Date.UTC(y, mo - 1, d))
    // Validar que no haya overflow (ej: 2026-02-31)
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== (mo - 1) || dt.getUTCDate() !== d) return null
    return dt
}

function daysInMonthUTC(year, monthIndex) {
    // monthIndex: 0-11
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

export function calcularEdadExacta(fechaNacimientoStr, refDate = new Date()) {
    const birth = parseDateOnly(fechaNacimientoStr)
    if (!birth) return null

    const ref = new Date(refDate)
    // Comparar en UTC para evitar desfases por zona horaria
    let y = ref.getUTCFullYear()
    let m = ref.getUTCMonth()
    let d = ref.getUTCDate()

    const by = birth.getUTCFullYear()
    const bm = birth.getUTCMonth()
    const bd = birth.getUTCDate()

    // Si la fecha de nacimiento está en el futuro, no calcular
    if (
        y < by ||
        (y === by && m < bm) ||
        (y === by && m === bm && d < bd)
    ) return null

    let years = y - by
    let months = m - bm
    let days = d - bd

    if (days < 0) {
        // pedir prestado del mes anterior
        const prevMonthIndex = (m - 1 + 12) % 12
        const prevMonthYear = prevMonthIndex === 11 ? y - 1 : y
        days += daysInMonthUTC(prevMonthYear, prevMonthIndex)
        months -= 1
    }

    if (months < 0) {
        months += 12
        years -= 1
    }

    const yearsDecimal = years + months / 12 + days / 365.2425
    return { years, months, days, yearsDecimal }
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
                    fecha_nacimiento: ['fecha nacimiento', 'nacimiento', 'f. nacimiento', 'fecha de nacimiento', 'fnac', 'f_nac'],
                    semestre: ['semestre', 'sem'],
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
                        fecha_nacimiento: String(row[columnMap['fecha_nacimiento']] || '').trim(),
                        semestre: String(row[columnMap['semestre']] || '').trim(),
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

                    // Auto-completar valores: tarifario oficial primero; si no, existingData
                    if (itemData.residencia && itemData.destino) {
                        const oficial = resolverTarifaOficial(itemData.residencia, itemData.destino)
                        if (oficial) {
                            itemData.valor_ida = oficial
                            itemData.valor_regreso = oficial
                        } else if (!itemData.valor_ida) {
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
    workbook.creator = 'Sistema de Entregas'
    workbook.created = new Date()

    // Aplicar tarifario oficial a las rutas conocidas; el resto se deja igual
    const dataConTarifas = aplicarTarifasOficiales(data)
    
    const columnsFull = [
        { header: 'No.', key: 'idx', width: 5 },
        { header: 'NOMBRE COMPLETO', key: 'nombre', width: 32 },
        { header: 'CÉDULA', key: 'cedula', width: 14 },
        { header: 'CORREO', key: 'correo', width: 28 },
        { header: 'TELÉFONO', key: 'telefono', width: 14 },
        { header: 'FECHA NACIMIENTO', key: 'fecha_nacimiento', width: 16 },
        { header: 'EDAD', key: 'edad', width: 14 },
        { header: 'SEMESTRE', key: 'semestre', width: 10 },
        { header: 'RESIDENCIA', key: 'residencia', width: 18 },
        { header: 'DESTINO', key: 'destino', width: 14 },
        { header: 'UNIVERSIDAD', key: 'universidad', width: 28 },
        { header: 'SISBEN', key: 'sisben', width: 12 },
        { header: 'LUNES', key: 'dia_lunes', width: 8 },
        { header: 'MARTES', key: 'dia_martes', width: 9 },
        { header: 'MIERCOLES', key: 'dia_miercoles', width: 11 },
        { header: 'JUEVES', key: 'dia_jueves', width: 9 },
        { header: 'VIERNES', key: 'dia_viernes', width: 9 },
        { header: 'SABADO', key: 'dia_sabado', width: 9 },
        { header: 'TOTAL SEMANAL', key: 'total_semanal', width: 12 },
        { header: 'TOTAL MENSUAL', key: 'total_mensual', width: 12 },
        { header: 'ENTREGÓ PAPELES', key: 'estado', width: 16 },
        { header: 'RECOGIÓ TICKET', key: 'recogio_ticket', width: 14 },
        { header: 'NOVEDADES / OBSERVACIONES', key: 'novedad_observacion', width: 35 },
        { header: 'IDA', key: 'ruta_ida', width: 22 },
        { header: 'VALOR IDA', key: 'valor_ida', width: 12 },
        { header: 'REGRESO', key: 'ruta_regreso', width: 22 },
        { header: 'VALOR REGRESO', key: 'valor_regreso', width: 13 }
    ];

    // Solo lo que se entrega al proveedor de tickets
    const columnsProveedor = [
        { header: 'No.', key: 'idx', width: 5 },
        { header: 'NOMBRE COMPLETO', key: 'nombre', width: 32 },
        { header: 'CÉDULA', key: 'cedula', width: 14 },
        { header: 'CORREO', key: 'correo', width: 28 },
        { header: 'TELÉFONO', key: 'telefono', width: 14 },
        { header: 'RESIDENCIA', key: 'residencia', width: 18 },
        { header: 'DESTINO', key: 'destino', width: 14 },
        { header: 'UNIVERSIDAD', key: 'universidad', width: 28 },
        { header: 'LUNES', key: 'dia_lunes', width: 8 },
        { header: 'MARTES', key: 'dia_martes', width: 9 },
        { header: 'MIERCOLES', key: 'dia_miercoles', width: 11 },
        { header: 'JUEVES', key: 'dia_jueves', width: 9 },
        { header: 'VIERNES', key: 'dia_viernes', width: 9 },
        { header: 'SABADO', key: 'dia_sabado', width: 9 },
        { header: 'TOTAL SEMANAL', key: 'total_semanal', width: 12 },
        { header: 'TOTAL MENSUAL', key: 'total_mensual', width: 12 },
        { header: 'IDA', key: 'ruta_ida', width: 22 },
        { header: 'VALOR IDA', key: 'valor_ida', width: 12 },
        { header: 'REGRESO', key: 'ruta_regreso', width: 22 },
        { header: 'VALOR REGRESO', key: 'valor_regreso', width: 13 }
    ];

    const addSheet = (name, list, colorHex, options = {}) => {
        const {
            includeEstado = true,
            cleanFormat = false,
            monthlySummary = false,
            columnSet = 'full',
        } = options;
        const sheet = workbook.addWorksheet(name);
        
        let currentColumns = columnSet === 'proveedor' ? [...columnsProveedor] : [...columnsFull];
        if (columnSet !== 'proveedor') {
            if (!includeEstado) {
                currentColumns = currentColumns.filter(col => col.key !== 'estado');
            }
            if (cleanFormat) {
                currentColumns = currentColumns.filter(col => col.key !== 'novedad_observacion');
            }
        }
        // Definir columnas sin header; la fila 1 será el encabezado de columnas.
        sheet.columns = currentColumns.map(c => ({ key: c.key, width: c.width }));

        const HEADER_ROW = 1

        // Encabezado de columnas (fila 1)
        const headerRow = sheet.getRow(HEADER_ROW)
        currentColumns.forEach((col, idx) => {
            const cell = headerRow.getCell(idx + 1)
            cell.value = col.header
            styleHeaderCell(cell, { bgColor: colorHex })
        })
        headerRow.height = 22

        // Congelar encabezado de columnas
        sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW, xSplit: 0 }]

        // Añadir datos
        list.forEach((item, i) => {
            const totalSemanal = [
                item.dia_lunes, item.dia_martes, item.dia_miercoles,
                item.dia_jueves, item.dia_viernes, item.dia_sabado
            ].filter(Boolean).length;
            
            const totalMensualReal = calcularTotalMensual(item, fechaEntrega);
            const edad = calcularEdadExacta(item.fecha_nacimiento)

            const rowData = {
                idx: i + 1,
                nombre: (item.nombre_completo || '').toUpperCase(),
                cedula: item.cedula,
                correo: item.correo,
                telefono: item.telefono,
                fecha_nacimiento: item.fecha_nacimiento || '',
                edad: edad ? `${edad.years}a ${edad.months}m ${edad.days}d` : '',
                semestre: item.semestre ?? '',
                residencia: normalizarTextoParaExcel(item.residencia),
                destino: normalizarTextoParaExcel(item.destino),
                universidad: normalizarTextoParaExcel(item.universidad),
                sisben: item.sisben || '',
                horario: item.horario || '',
                ruta: normalizarTextoParaExcel(item.ruta),
                dia_lunes: item.dia_lunes ? 'X' : '',
                dia_martes: item.dia_martes ? 'X' : '',
                dia_miercoles: item.dia_miercoles ? 'X' : '',
                dia_jueves: item.dia_jueves ? 'X' : '',
                dia_viernes: item.dia_viernes ? 'X' : '',
                dia_sabado: item.dia_sabado ? 'X' : '',
                total_semanal: totalSemanal > 0 ? totalSemanal : '',
                total_mensual: totalMensualReal !== '' && totalMensualReal > 0 ? totalMensualReal : (totalSemanal > 0 ? (totalSemanal * 4) : ''),
                recogio_ticket: ticketData[item.cedula] === false ? 'NO RECOGIÓ' : (ticketData[item.cedula] === true ? 'SÍ RECOGIÓ' : ''),
                ruta_ida: normalizarTextoParaExcel(item.ruta_ida),
                valor_ida: item.valor_ida || '',
                ruta_regreso: normalizarTextoParaExcel(item.ruta_regreso),
                valor_regreso: item.valor_regreso || ''
            };

            if (includeEstado && columnSet !== 'proveedor') {
                rowData.estado = item.estado_entrega;
            }
            if (!cleanFormat && columnSet !== 'proveedor') {
                rowData.novedad_observacion = item.novedad_observacion || '';
            }

            const row = sheet.addRow(rowData);

            // Determinar color de la fila según novedades (Prioridad)
            let rowBgColor = null;
            let textColor = 'FF000000';

            if (!cleanFormat && columnSet !== 'proveedor') {
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

            // Aplicar estilos a cada celda: todo centrado y acomodado
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const colKey = currentColumns[colNumber - 1]?.key || '';
                const wrap = colKey === 'novedad_observacion' || colKey === 'nombre' || colKey === 'universidad' || colKey === 'correo';

                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: wrap };
                cell.font = {
                    ...(rowBgColor ? { color: { argb: textColor } } : {}),
                    size: 10
                };

                if (rowBgColor) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: rowBgColor }
                    };
                }
            });
        });

        // --- RESUMEN TOTAL MENSUAL (hojas proveedor) ---
        let summaryRowsUsed = 0;
        if (monthlySummary && list.length > 0) {
            const startRow = HEADER_ROW + list.length + 2
            summaryRowsUsed = appendProveedorMonthlySummary(sheet, list, fechaEntrega, colorHex, startRow);
        }

        // --- AGREGAR LEYENDA DE COLORES AL FINAL ---
        if (!cleanFormat && columnSet !== 'proveedor') {
            const lastDataRow = HEADER_ROW + list.length;
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

        // Auto-ajustar anchos SOLO con filas de datos (evita que el resumen ensanche "No.")
        const lastDataRow = HEADER_ROW + Math.max(list.length, 0)
        currentColumns.forEach((colDef, idx) => {
            const col = sheet.getColumn(idx + 1)
            let maxLen = String(colDef.header || '').length

            for (let r = HEADER_ROW + 1; r <= lastDataRow; r++) {
                const val = sheet.getRow(r).getCell(idx + 1).value
                if (val == null || val === '') continue
                maxLen = Math.max(maxLen, String(val).length)
            }

            if (colDef.key === 'idx') {
                // Solo lo necesario para el número (ej. 1..999)
                col.width = Math.max(4, Math.min(6, String(Math.max(list.length, 1)).length + 2))
            } else if (colDef.key.startsWith('dia_')) {
                col.width = Math.max(8, Math.min(11, maxLen + 1))
            } else if (colDef.key === 'semestre' || colDef.key.startsWith('total_') || colDef.key.startsWith('valor_')) {
                col.width = Math.max(10, Math.min(14, maxLen + 2))
            } else if (colDef.key === 'novedad_observacion') {
                col.width = Math.min(40, Math.max(20, maxLen + 2))
            } else {
                // Ajuste al texto, con tope razonable
                col.width = Math.min(45, Math.max(colDef.width || 10, maxLen + 2))
            }
        });

        // Filtro automático en TODAS las columnas
        sheet.autoFilter = {
            from: { row: HEADER_ROW, column: 1 },
            to: { row: list.length === 0 ? HEADER_ROW : HEADER_ROW + list.length, column: currentColumns.length }
        };
    };

    // Proveedor: con días y destino, y menores de 29 años (29 o más no generan ticket)
    const dataProveedor = dataConTarifas.filter(d => {
        const tieneDias = d.dia_lunes || d.dia_martes || d.dia_miercoles || d.dia_jueves || d.dia_viernes || d.dia_sabado;
        if (!tieneDias || !d.destino || d.destino.trim() === '') return false
        const edad = calcularEdadExacta(d.fecha_nacimiento)
        if (edad && edad.years >= 29) return false
        return true
    });

    // 1) COMPLETO: todo el detalle interno
    addSheet('COMPLETO', dataConTarifas, 'FF2B6CB0', { includeEstado: true, cleanFormat: false, columnSet: 'full' });

    // 2) PROVEEDOR: solo columnas que se entregan al proveedor de tickets
    addSheet('PROVEEDOR TICKETS', dataProveedor, 'FFD97706', {
        includeEstado: false,
        cleanFormat: true,
        monthlySummary: true,
        columnSet: 'proveedor',
    });

    // Hojas auxiliares (auditoría / filtros)
    addSheet('ENTREGARON PAPELES', dataConTarifas.filter(d => d.estado_entrega === 'SÍ ENTREGÓ'), 'FF2F855A');
    addSheet('NO ENTREGARON PAPELES', dataConTarifas.filter(d => d.estado_entrega === 'NO ENTREGÓ'), 'FFC53030');

    const reemplazos = dataConTarifas.filter(d => d.is_replacement);
    const diasAgregados = dataConTarifas.filter(d => d.days_added_later);
    const nuevos = dataConTarifas.filter(d => d.is_new);
    const conObservacion = dataConTarifas.filter(d => d.novedad_observacion && d.novedad_observacion.trim() !== '');
    const resumenNovedades = dataConTarifas.filter(d => 
        d.is_replacement || 
        d.days_added_later || 
        d.is_new || 
        (d.novedad_observacion && d.novedad_observacion.trim() !== '')
    );

    if (reemplazos.length > 0) addSheet('REEMPLAZOS', reemplazos, 'FFFBC02D');
    if (diasAgregados.length > 0) addSheet('DÍAS ADICIONADOS', diasAgregados, 'FF0288D1');
    if (nuevos.length > 0) addSheet('REGISTROS NUEVOS', nuevos, 'FF388E3C');
    if (conObservacion.length > 0) addSheet('OBSERVACIONES MANUALES', conObservacion, 'FFFFA726');
    if (resumenNovedades.length > 0) addSheet('RESUMEN NOVEDADES', resumenNovedades, 'FFE65100');

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
