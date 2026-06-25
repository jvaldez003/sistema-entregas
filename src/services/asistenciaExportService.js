import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Convertir logo a base64
async function getLogoBase64() {
    try {
        const response = await fetch('/logo_candelaria.png');
        if (!response.ok) {
            console.warn('No se pudo cargar el logo (HTTP ' + response.status + ')');
            return null;
        }
        const blob = await response.blob();
        if (blob.type !== 'image/png' && blob.type !== 'image/jpeg') {
            console.warn('Formato de logo inválido:', blob.type);
            return null;
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error cargando logo', error);
        return null;
    }
}

function getDiasViaje(item) {
    const dias = [];
    if (item.dia_lunes) dias.push('L');
    if (item.dia_martes) dias.push('M');
    if (item.dia_miercoles) dias.push('Mi');
    if (item.dia_jueves) dias.push('J');
    if (item.dia_viernes) dias.push('V');
    if (item.dia_sabado) dias.push('S');
    return dias.join(', ');
}

export function getColombianHolidays(year) {
    const holidays = [];

    const addDays = (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const nextMonday = (date) => {
        const result = new Date(date);
        const day = result.getDay();
        if (day !== 1) { 
            const diff = day === 0 ? 1 : 8 - day; 
            result.setDate(result.getDate() + diff);
        }
        return result;
    };

    // 1. Fijos
    holidays.push({ date: new Date(year, 0, 1), name: 'Año Nuevo' });
    holidays.push({ date: new Date(year, 4, 1), name: 'Día del Trabajo' });
    holidays.push({ date: new Date(year, 6, 20), name: 'Independencia de Colombia' });
    holidays.push({ date: new Date(year, 7, 7), name: 'Batalla de Boyacá' });
    holidays.push({ date: new Date(year, 11, 8), name: 'Inmaculada Concepción' });
    holidays.push({ date: new Date(year, 11, 25), name: 'Navidad' });

    // 2. Ley Emiliani (Se mueven al lunes si no caen en lunes)
    holidays.push({ date: nextMonday(new Date(year, 0, 6)), name: 'Reyes Magos' });
    holidays.push({ date: nextMonday(new Date(year, 2, 19)), name: 'San José' });
    holidays.push({ date: nextMonday(new Date(year, 5, 29)), name: 'San Pedro y San Pablo' });
    holidays.push({ date: nextMonday(new Date(year, 7, 15)), name: 'Asunción de la Virgen' });
    holidays.push({ date: nextMonday(new Date(year, 9, 12)), name: 'Día de la Raza' });
    holidays.push({ date: nextMonday(new Date(year, 10, 1)), name: 'Todos los Santos' });
    holidays.push({ date: nextMonday(new Date(year, 10, 11)), name: 'Independencia de Cartagena' });

    // 3. Basados en Pascua
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; 
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    const easterSunday = new Date(year, month, day);

    holidays.push({ date: addDays(easterSunday, -3), name: 'Jueves Santo' });
    holidays.push({ date: addDays(easterSunday, -2), name: 'Viernes Santo' });
    holidays.push({ date: nextMonday(addDays(easterSunday, 39)), name: 'Ascensión del Señor' });
    holidays.push({ date: nextMonday(addDays(easterSunday, 60)), name: 'Corpus Christi' });
    holidays.push({ date: nextMonday(addDays(easterSunday, 68)), name: 'Sagrado Corazón' });

    return holidays.map(h => {
        const d = h.date;
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        return {
            dateString: `${d.getFullYear()}-${m}-${dayStr}`,
            name: h.name
        };
    });
}

export function calcularTotalMensual(item, fechaEntregaStr) {
    if (!fechaEntregaStr) return '';
    const [year, month, day] = fechaEntregaStr.split('-').map(Number);
    const fecha = new Date(year, month - 1, day);
    const ultimoDiaMes = new Date(year, month, 0); 
    
    const studentDays = {
        1: item.dia_lunes,
        2: item.dia_martes,
        3: item.dia_miercoles,
        4: item.dia_jueves,
        5: item.dia_viernes,
        6: item.dia_sabado,
        0: false
    };
    
    const festivos = getColombianHolidays(year).map(f => f.dateString);

    let totalTickets = 0;
    for (let d = new Date(fecha); d <= ultimoDiaMes; d.setDate(d.getDate() + 1)) {
        const dMonth = String(d.getMonth() + 1).padStart(2, '0');
        const dDate = String(d.getDate()).padStart(2, '0');
        const dString = `${d.getFullYear()}-${dMonth}-${dDate}`;

        if (studentDays[d.getDay()] && !festivos.includes(dString)) {
            totalTickets += 1;
        }
    }
    return totalTickets;
}

export const exportAsistenciaToExcel = async (data, fechaEntrega) => {
    const workbook = new ExcelJS.Workbook();
    const logoBase64 = await getLogoBase64();

    const dataConDias = data.filter(item => item.dia_lunes || item.dia_martes || item.dia_miercoles || item.dia_jueves || item.dia_viernes || item.dia_sabado);
    const dataSinDias = data.filter(item => !(item.dia_lunes || item.dia_martes || item.dia_miercoles || item.dia_jueves || item.dia_viernes || item.dia_sabado));

    const buildSheet = (sheetName, sheetData) => {
        const sheet = workbook.addWorksheet(sheetName);

        sheet.pageSetup = { paperSize: 5, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:6' };
        sheet.headerFooter = { oddHeader: '&R Página &P de &N', evenHeader: '&R Página &P de &N' };

        // Configurar columnas de datos
        sheet.columns = [
            { key: 'no', width: 5 },
            { key: 'nombre', width: 36 },
            { key: 'cedula', width: 14 },
            { key: 'telefono', width: 26 },
            { key: 'l', width: 6 },
            { key: 'm', width: 6 },
            { key: 'mi', width: 6 },
            { key: 'j', width: 6 },
            { key: 'v', width: 6 },
            { key: 's', width: 6 },
            { key: 'total', width: 14 },
            { key: 'beneficiario', width: 25 },
            { key: 'acudiente', width: 25 },
            { key: 'observaciones', width: 12 }
        ];

        // Encabezado principal (Filas 1 a 4)
        sheet.mergeCells('A1:B4'); // Logo
        sheet.mergeCells('C1:N4'); // Título Central alineado

        sheet.getCell('C1').value = 'MUNICIPIO DE CANDELARIA\nLISTADO DE ENTREGA DE TICKETS TRANSPORTE UNIVERSITARIO';
        sheet.getCell('C1').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        sheet.getCell('C1').font = { bold: true, size: 14 };

        // Fila 5: Detalles de la sesión
        sheet.mergeCells('A5:B5');
        sheet.getCell('A5').value = 'FECHA:';
        
        sheet.mergeCells('C5:H5');
        sheet.getCell('C5').value = 'TEMA SESIÓN:';
        
        sheet.mergeCells('I5:K5'); // Actividad
        sheet.getCell('I5').value = 'NOMBRE DE LA ACTIVIDAD: ENTREGA DE TICKETS TRANSPORTE UNIVERSITARIO';

        sheet.mergeCells('L5:N5'); // Dimensión
        sheet.getCell('L5').value = 'DIMENSIÓN O PROYECTO: FORTALECIMIENTO AL ACCESO A LA EDUCACION SUPERIOR';

        // Estilos de los bordes del encabezado
        for(let i=1; i<=5; i++) {
            sheet.getRow(i).eachCell({ includeEmpty: true }, cell => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                if(i !== 1 || cell.address.startsWith('C') || cell.address.startsWith('J')) {
                    if (!cell.font) cell.font = {};
                    cell.font.bold = true;
                    if (i===5) cell.font.size = 10;
                }
                if(i === 5) {
                    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
                }
            });
        }
        
        sheet.getRow(5).height = 40; // Mayor altura para evitar que se recorte el texto

        // Insertar Logo (Si existe)
        if (logoBase64) {
            const imageId = workbook.addImage({
                base64: logoBase64,
                extension: 'png',
            });
            sheet.addImage(imageId, {
                tl: { col: 0, row: 0, colOff: 15, rowOff: 5 }, // Pequeño offset para centrar
                ext: { width: 50, height: 65 } // Proporción más parecida a un escudo vertical
            });
        } else {
            sheet.getCell('A1').value = 'LOGO CANDELARIA';
            sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // Fila 6: Nombres de las columnas de la tabla
        const headerRow = sheet.getRow(6);
        headerRow.values = ['No.', 'NOMBRE', 'CÉDULA', 'TELÉFONO', 'L', 'M', 'MI', 'J', 'V', 'S', 'TOTAL MENSUAL', 'BENEFICIARIO', 'ACUDIENTE', 'OBSERVACIONES'];
        headerRow.eachCell({ includeEmpty: true }, cell => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.font = { bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        });

        // Filas de datos
        sheetData.forEach((item, index) => {
            const row = sheet.addRow([
                index + 1,
                item.nombre_completo,
                item.cedula,
                item.telefono || '',
                item.dia_lunes ? 'X' : '',
                item.dia_martes ? 'X' : '',
                item.dia_miercoles ? 'X' : '',
                item.dia_jueves ? 'X' : '',
                item.dia_viernes ? 'X' : '',
                item.dia_sabado ? 'X' : '',
                calcularTotalMensual(item, fechaEntrega), // Total
                '', // Beneficiario
                '', // Acudiente
                ''  // Observaciones
            ]);

            row.height = 45; // Mayor espacio para firma
            row.eachCell({ includeEmpty: true }, cell => {
                cell.border = { 
                    top: {style:'thin'}, 
                    left: {style:'thin'}, 
                    bottom: {style:'medium'}, // Gruesa solo abajo para evitar solapamiento oscuro y prevenir que desaparezca
                    right: {style:'thin'} 
                };
                cell.alignment = { vertical: 'middle', wrapText: true };
                if (cell.col === 1 || (cell.col >= 5 && cell.col <= 11)) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                }
            });
        });
    };

    buildSheet('Asistencia', dataConDias);
    if (dataSinDias.length > 0) {
        buildSheet('Sin Días Asignados', dataSinDias);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `LISTADO_ASISTENCIA_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportAsistenciaToPDF = async (data, fechaEntrega) => {
    try {
        // Tamaño Oficio Colombiano: 8.5 x 13 pulgadas = 215.9 x 330.2 mm
        const doc = new jsPDF({ orientation: 'landscape', format: [215.9, 330.2] });
        const logoBase64 = await getLogoBase64();

    // Función para pintar la cabecera en cada página
    const drawHeader = (doc, pageNumber, totalPages) => {
        const isOdd = pageNumber % 2 !== 0;

        if (!isOdd) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Página ${pageNumber} de ${totalPages}`, 320, 10, { align: 'right' });
            return;
        }

        const pageWidth = 330.2; // Ancho exacto del papel Oficio
        const margin = 10;
        const printWidth = pageWidth - (margin * 2); // 310.2

        doc.setLineWidth(0.3);
        doc.rect(margin, 10, printWidth, 30);

        doc.line(60, 10, 60, 40);
        doc.line(270, 10, 270, 40); // Ajustado para nuevo ancho

        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 22, 11, 26, 28);
        } else {
            doc.setFontSize(12);
            doc.text("LOGO", 30, 25);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text("MUNICIPIO DE CANDELARIA", 165, 22, { align: 'center' });
        doc.setFontSize(11);
        doc.text("LISTADO DE ENTREGA DE TICKETS TRANSPORTE UNIVERSITARIO", 165, 28, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Página ${pageNumber} de ${totalPages}`, 295, 26, { align: 'center' });

        doc.rect(margin, 40, printWidth, 10);
        doc.line(60, 40, 60, 50);
        doc.line(175, 40, 175, 50);
        doc.line(270, 40, 270, 50);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("FECHA:", 12, 46);
        
        doc.setFontSize(9);
        doc.text("TEMA SESIÓN:", 62, 46);
        
        doc.setFontSize(7.5);
        const actText = doc.splitTextToSize("NOMBRE DE LA ACTIVIDAD: ENTREGA DE TICKETS TRANSPORTE UNIVERSITARIO", 90);
        doc.text(actText, 177, 44);
        
        doc.setFontSize(7); // Ligeramente más pequeño para encajar
        const dimText = doc.splitTextToSize("DIMENSIÓN O PROYECTO: FORTALECIMIENTO AL ACCESO A LA EDUCACION SUPERIOR", 48);
        doc.text(dimText, 272, 43.5);
    };

    // Tabla de Asistencia
    const tableData = data.map((item, index) => [
        index + 1,
        item.nombre_completo,
        item.cedula,
        item.telefono || '',
        item.dia_lunes ? 'X' : '',
        item.dia_martes ? 'X' : '',
        item.dia_miercoles ? 'X' : '',
        item.dia_jueves ? 'X' : '',
        item.dia_viernes ? 'X' : '',
        item.dia_sabado ? 'X' : '',
        calcularTotalMensual(item, fechaEntrega), // Total
        '', // Beneficiario
        '', // Acudiente
        ''  // Observaciones
    ]);

    autoTable(doc, {
        startY: 50, // Conectar exactamente con el final de la cabecera (y=50)
        head: [['No.', 'NOMBRE', 'CÉDULA', 'TELÉFONO', 'L', 'M', 'MI', 'J', 'V', 'S', 'TOTAL MEN.', 'BENEFICIARIO', 'ACUDIENTE', 'OBSERVACIONES']],
        body: tableData,
        theme: 'grid',
        rowPageBreak: 'avoid',
        styles: { 
            fontSize: 8, 
            cellPadding: 2, 
            valign: 'middle',
            lineColor: [0, 0, 0], 
            lineWidth: 0.3 
        },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 50 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 6, halign: 'center' },
            5: { cellWidth: 6, halign: 'center' },
            6: { cellWidth: 6, halign: 'center' },
            7: { cellWidth: 6, halign: 'center' },
            8: { cellWidth: 6, halign: 'center' },
            9: { cellWidth: 6, halign: 'center' },
            10: { cellWidth: 13, halign: 'center' }, // Total
            11: { cellWidth: 50 }, // Beneficiario
            12: { cellWidth: 50 }, // Acudiente
            13: { cellWidth: 'auto' } // Observaciones
        },
        bodyStyles: { minCellHeight: 9.5 }, 
        didDrawPage: function (data) {
            const pageNum = doc.internal.getNumberOfPages();
            drawHeader(doc, pageNum, '{totalPages}');
            
            // Alternar márgenes para la siguiente página generada
            // Si la actual es impar, la siguiente será par (reverso), así que le damos más espacio (margen top 15)
            // Si la actual es par, la siguiente será impar, vuelve a necesitar espacio para la cabecera (margen top 55)
            if (pageNum % 2 !== 0) {
                data.settings.margin.top = 15;
            } else {
                data.settings.margin.top = 50;
            }
        },
        margin: { top: 50, bottom: 15, left: 10, right: 10 }
    });

    // Poner el total de páginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // Usar regex o putTotalPages? En jsPDF, podemos reemplazar text
        // Sin embargo, dibujamos el texto estáticamente. Un truco es borrar y re-escribir, o usar un token especial y luego usar putTotalPages.
        // JS PDF soporta `putTotalPages(totalPagesExp)`
    }
    
    // Mejor usaremos putTotalPages de jsPDF
    if (typeof doc.putTotalPages === 'function') {
        doc.putTotalPages('{totalPages}');
    }

    doc.save(`LISTADO_ASISTENCIA_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
        console.error("Error al generar PDF:", error);
        alert("Ocurrió un error al generar el PDF. Revisa la consola para más detalles.");
    }
};
