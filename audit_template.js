import ExcelJS from 'exceljs';
import fs from 'fs';

async function audit() {
    const workbook = new ExcelJS.Workbook();
    // Leer el archivo localmente si existe o usar el path absoluto
    await workbook.xlsx.readFile('c:/Users/Usuario/sistema-entregas/public/asistencia_template.xlsx');
    const sheet = workbook.worksheets[0];
    
    console.log('--- MERGES ---');
    const merges = [];
    // En ExcelJS, sheet._merges es privado pero accesible en modo node o via iteración
    const m = sheet.model.merges;
    m.forEach(mergedRange => {
        console.log(mergedRange);
    });
    
    console.log('--- ROW HEIGHTS ---');
    for(let i=1; i<=22; i++) {
        console.log(`Row ${i}: ${sheet.getRow(i).height}`);
    }
}

audit();
