import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import styles from './InventarioPage.module.css'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export default function InventarioPage({ session }) {
  const [tab, setTab] = useState('stock') // 'stock' | 'movimiento' | 'history'
  const [items, setItems] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [histSearch, setHistSearch] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [editingInvoice, setEditingInvoice] = useState(null) // { oldRef: '', newRef: '', newDate: '' }

  // Formulario de Ingreso
  const [formData, setFormData] = useState({
    referencia: '',
    fecha: new Date().toISOString().split('T')[0],
    solicitante: '',
    tipo: 'ENTRADA',
    rows: [{ codigo: '', nombre: '', solicitado: '', entregado: '' }]
  })

  // ─── Carga de Datos ───
  const fetchInventory = useCallback(async () => {
    setLoading(true)
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventario_items')
        .select(`*, movimientos:inventario_movimientos(tipo, cantidad)`)
        .order('codigo', { ascending: true })

      if (itemsError) throw itemsError

      const processed = itemsData.map(item => {
        const stock = item.movimientos.reduce((acc, mov) => {
          return mov.tipo === 'ENTRADA' ? acc + mov.cantidad : acc - mov.cantidad
        }, 0)
        return { ...item, stock }
      })
      setItems(processed)

      const { data: movsData, error: movsError } = await supabase
        .from('inventario_movimientos')
        .select('*, item:inventario_items(codigo, nombre)')
        .order('fecha', { ascending: false }, 'created_at', { ascending: false })
      
      if (movsError) throw movsError
      setMovimientos(movsData)

    } catch (err) {
      console.error('Error fetching inventory:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  // ─── Lógica del Formulario ───
  const addRow = () => {
    setFormData(prev => ({
      ...prev,
      rows: [...prev.rows, { codigo: '', nombre: '', solicitado: '', entregado: '' }]
    }))
  }

  const removeRow = (index) => {
    setFormData(prev => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== index)
    }))
  }

  const updateRow = (index, field, value) => {
    const newRows = [...formData.rows]
    newRows[index][field] = value
    if (field === 'codigo') {
      const exist = items.find(i => i.codigo === value)
      if (exist) newRows[index].nombre = exist.nombre
    }
    if (field === 'solicitado') newRows[index].entregado = value
    setFormData(prev => ({ ...prev, rows: newRows }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.tipo === 'SALIDA') {
      for (const row of formData.rows) {
        const itemInStock = items.find(i => i.codigo === row.codigo)
        const qty = parseFloat(row.entregado) || 0
        if (!itemInStock || qty > itemInStock.stock) {
           alert(`Error en stock para: ${row.nombre || row.codigo}`); return;
        }
      }
    }

    setLoading(true)
    try {
      for (const row of formData.rows) {
        if (!row.codigo || !row.entregado) continue
        const { data: item } = await supabase
          .from('inventario_items')
          .upsert({ codigo: row.codigo, nombre: row.nombre || 'Producto Nuevo' }, { onConflict: 'codigo' })
          .select().single()

        await supabase.from('inventario_movimientos').insert({
          item_id: item.id,
          tipo: formData.tipo,
          cantidad: parseFloat(row.entregado),
          cantidad_solicitada: parseFloat(row.solicitado) || parseFloat(row.entregado),
          fecha: formData.fecha,
          referencia: formData.referencia,
          solicitante: formData.solicitante
        })
      }
      alert('¡Datos guardados!'); fetchInventory(); setTab('stock');
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = async (id) => {
    if (confirm('¿Eliminar?')) {
      await supabase.from('inventario_items').delete().eq('id', id);
      fetchInventory();
    }
  }

  const handleSaveEdit = async () => {
    await supabase.from('inventario_items').update({ nombre: editingItem.nombre, codigo: editingItem.codigo }).eq('id', editingItem.id)
    setEditingItem(null); fetchInventory();
  }

  const handleSaveInvoiceEdit = async () => {
    if (!editingInvoice) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('inventario_movimientos')
        .update({ 
          referencia: editingInvoice.newRef, 
          fecha: editingInvoice.newDate 
        })
        .eq('referencia', editingInvoice.oldRef);

      if (error) throw error;
      alert('¡Factura actualizada masivamente!');
      setEditingInvoice(null);
      fetchInventory();
    } catch (err) {
      alert('Error al actualizar factura: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ─── EXPORTACIÓN PREMIUM A EXCEL ───
  const exportToExcel = async () => {
    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const mainTitle = "ALCALDÍA DE CANDELARIA — VALLE DEL CAUCA, COLOMBIA";
      const subTitle = "ENTREGA DE PRODUCTOS DE ASEO Y PAPELERÍA — MULTICAMPUS UNIVERSITARIO";
      const bgColor = 'FFFFFFFF'; 

      let logoId = null;
      try {
        const logoResponse = await fetch('/logo_candelaria.png');
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer();
          logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
        }
      } catch (e) { console.warn("No se pudo cargar el logo:", e); }

      const setupSheet = (sheet, isHistory = false) => {
          const lastCol = isHistory ? 7 : 4;
          for (let i = 1; i <= 4; i++) {
              const row = sheet.getRow(i);
              for (let j = 1; j <= lastCol; j++) {
                  row.getCell(j).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
              }
          }
          if (logoId !== null) {
            sheet.addImage(logoId, { tl: { col: 0.25, row: 0.2 }, br: { col: 0.95, row: 3.8 }, editAs: 'oneCell' });
          }
          for (let i = 1; i <= 4; i++) { sheet.getCell(`A${i}`).border = { right: { style: 'medium' } }; }
          const textRange = `B1:${isHistory ? 'G' : 'D'}4`;
          sheet.mergeCells(textRange);
          const tCell = sheet.getCell('B1');
          tCell.value = {
              richText: [
                  { text: `${mainTitle}\n`, font: { bold: true, size: 12 } },
                  { text: isHistory ? "HISTORIAL DE MOVIMIENTOS Y PENDIENTES — MULTICAMPUS" : subTitle, font: { size: 10 } }
              ]
          };
          tCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          for (let j = 1; j <= lastCol; j++) {
              sheet.getCell(1, j).border = { ...sheet.getCell(1, j).border, top: { style: 'medium' } };
              sheet.getCell(4, j).border = { ...sheet.getCell(4, j).border, bottom: { style: 'medium' } };
          }
          sheet.getRow(1).height = 20; sheet.getRow(4).height = 20; sheet.getColumn(1).width = 18;
      };

      const sheet1 = workbook.addWorksheet('Resumen de Stock');
      setupSheet(sheet1);
      sheet1.addTable({
        name: 'StockTable', ref: 'A6', headerRow: true,
        style: { theme: 'TableStyleMedium2', showRowStripes: true },
        columns: [{ name: 'CÓDIGO' }, { name: 'ARTÍCULO' }, { name: 'STOCK' }, { name: 'ESTADO' }],
        rows: items.map(i => [i.codigo, i.nombre, i.stock, i.stock < 5 ? '⚠️ BAJO' : '✓ OK'])
      });
      sheet1.eachRow((row, rowNumber) => {
        if (rowNumber > 6) {
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
              if(colNumber !== 2) cell.alignment = { horizontal: 'center' };
          });
          if (parseFloat(row.getCell(3).value) < 5) row.getCell(4).font = { color: { argb: 'FFFF0000' }, bold: true };
          else row.getCell(4).font = { color: { argb: 'FF16A34A' }, bold: true };
        }
      });
      sheet1.columns = [{ width: 18 }, { width: 55 }, { width: 18 }, { width: 18 }];

      const sheet2 = workbook.addWorksheet('Historial Completo');
      setupSheet(sheet2, true);
      sheet2.addTable({
        name: 'HistoryTable', ref: 'A6', headerRow: true,
        style: { theme: 'TableStyleMedium2', showRowStripes: true },
        columns: [{ name: 'FECHA' }, { name: 'FACTURA' }, { name: 'TIPO' }, { name: 'ARTÍCULO' }, { name: 'PEDIDO' }, { name: 'REAL' }, { name: 'SALDO' }],
        rows: movimientos.map(m => {
            const pend = (m.cantidad_solicitada || m.cantidad) - m.cantidad;
            return [m.fecha, m.referencia, m.tipo, m.item?.nombre, m.cantidad_solicitada || m.cantidad, m.cantidad, pend > 0 ? pend : 'OK'];
        })
      });
      sheet2.eachRow((row, rowNumber) => {
          if (rowNumber > 6) {
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                if(colNumber !== 4) cell.alignment = { horizontal: 'center' };
            });
            if (row.getCell(3).value === 'SALIDA') row.getCell(3).font = { color: { argb: 'FFEF4444' }, bold: true };
            if (row.getCell(7).value !== 'OK') row.getCell(7).font = { color: { argb: 'FFEA580C' }, bold: true };
          }
      });
      sheet2.columns = [{ width: 18 }, { width: 18 }, { width: 12 }, { width: 45 }, { width: 12 }, { width: 12 }, { width: 15 }];

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `INVENTARIO_MULTICAMPUS.xlsx`);
    } catch (err) { alert("Error al generar Excel: " + err.message); }
    finally { setLoading(false); }
  };

  const filteredItems = items.filter(i => i.codigo.toLowerCase().includes(search.toLowerCase()) || i.nombre.toLowerCase().includes(search.toLowerCase()))
  const filteredMovs = movimientos.filter(m => (m.referencia || '').toLowerCase().includes(histSearch.toLowerCase()))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleInfo}>
          <h1 className={styles.title}>📦 Control de Inventario</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: 4 }}>Multicampus Universitario • Gestión de Activos</p>
        </div>
        <button className="btn btn-primary" onClick={exportToExcel} disabled={loading} style={{ padding: '12px 24px', borderRadius: 12 }}>
          {loading ? 'Procesando...' : 'Descargar Reporte Excel ⎙'}
        </button>
      </header>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'stock' ? styles.tabActive : ''}`} onClick={() => { setTab('stock'); setEditingItem(null); }}> 📊 Stock Actual </button>
        <button className={`${styles.tab} ${tab === 'movimiento' ? styles.tabActive : ''}`} onClick={() => setTab('movimiento')}> 📝 Registrar Factura </button>
        <button className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`} onClick={() => { setTab('history'); setEditingInvoice(null); }}> 🕒 Historial </button>
      </div>

      {tab === 'stock' && (
        <div className={styles.tableCard}>
          <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
             <input className={styles.input} style={{ maxWidth: 450 }} placeholder="🔍 Buscar artículo..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <table className={styles.table}>
            <thead><tr><th>Cód</th><th>Descripción</th><th>Existencia</th><th>Acciones</th></tr></thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td>{editingItem?.id === item.id ? <input className={styles.input} style={{ padding: '6px' }} value={editingItem.codigo} onChange={e => setEditingItem({ ...editingItem, codigo: e.target.value })} /> : <span style={{ fontWeight: 800, color: '#2563eb' }}>{item.codigo}</span>}</td>
                  <td>{editingItem?.id === item.id ? <input className={styles.input} style={{ padding: '6px' }} value={editingItem.nombre} onChange={e => setEditingItem({ ...editingItem, nombre: e.target.value })} /> : <span style={{ fontWeight: 600 }}>{item.nombre}</span>}</td>
                  <td><span className={`${styles.qtyBadge} ${item.stock < 5 ? styles.stockAlert : ''}`}>{item.stock} unidades {item.stock < 5 && '⚠️'}</span></td>
                  <td><div style={{ display: 'flex', gap: 10 }}>{editingItem?.id === item.id ? <button className="btn btn-primary" onClick={handleSaveEdit}>Guardar</button> : <><button className="btn btn-icon" onClick={() => setEditingItem(item)}>✏️</button><button className="btn btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDeleteItem(item.id)}>🗑️</button></>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'movimiento' && (
        <div className={styles.formCard}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, color: '#1e293b' }}>Registro de Factura de Pedido</h2>
          <form onSubmit={handleSubmit}>
             <div className={styles.formHeader}>
               <div className={styles.field}><label className={styles.label}>Nº Referencia / Factura</label><input className={styles.input} value={formData.referencia} onChange={e => setFormData({ ...formData, referencia: e.target.value })} /></div>
               <div className={styles.field}><label className={styles.label}>Fecha</label><input type="date" className={styles.input} value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} /></div>
               <div className={styles.field}><label className={styles.label}>Tipo de Operación</label><select className={styles.input} value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })}><option value="ENTRADA">📥 ENTRADA</option><option value="SALIDA">📤 SALIDA</option></select></div>
             </div>
             <div className={styles.field} style={{ marginBottom: 32 }}><label className={styles.label}>Responsable</label><input className={styles.input} value={formData.solicitante} onChange={e => setFormData({ ...formData, solicitante: e.target.value })} /></div>
             <div className={styles.grid}>
               <div className={styles.gridHeader}><span>CÓD</span><span>ARTÍCULO</span><span style={{ textAlign: 'center' }}>PEDIDO</span><span style={{ textAlign: 'center' }}>ENTREGADO</span><span></span></div>
               {formData.rows.map((row, idx) => {
                 const itemData = items.find(i => i.codigo === row.codigo);
                 return (
                   <div key={idx} className={styles.gridRow}>
                     <div><input className={styles.gridInput} placeholder="66" value={row.codigo} onChange={e => updateRow(idx, 'codigo', e.target.value)} />{itemData && <div style={{ fontSize: 9, color: '#2563eb', paddingLeft: 8, fontWeight: 700 }}>Stock: {itemData.stock}</div>}</div>
                     <input className={styles.gridInput} placeholder="Descripción..." value={row.nombre} onChange={e => updateRow(idx, 'nombre', e.target.value)} />
                     <input type="number" className={styles.gridInput} style={{ textAlign: 'center' }} placeholder="0" value={row.solicitado} onChange={e => updateRow(idx, 'solicitado', e.target.value)} />
                     <input type="number" className={styles.gridInput} style={{ textAlign: 'center' }} placeholder="0" value={row.entregado} onChange={e => updateRow(idx, 'entregado', e.target.value)} />
                     <button type="button" className={styles.removeBtn} onClick={() => removeRow(idx)}>✕</button>
                   </div>
                 );
               })}
             </div>
             <button type="button" className={styles.addBtn} onClick={addRow}>+ Agregar otra fila</button>
             <div className={styles.actions}><button type="submit" className="btn btn-primary" style={{ padding: '16px 48px', fontSize: 16, borderRadius: 14 }} disabled={loading}>Guardar Datos</button></div>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className={styles.tableCard}>
          <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'center' }}>
             <input className={styles.input} style={{ maxWidth: 450 }} placeholder="🔍 Buscar factura..." value={histSearch} onChange={e => setHistSearch(e.target.value)} />
             {editingInvoice && (
               <div style={{ background: '#fef3c7', padding: '10px 15px', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #fcd34d' }}>
                 <span style={{ fontSize: 12, fontWeight: 800 }}>Editando: {editingInvoice.oldRef}</span>
                 <input type="date" className={styles.input} style={{ padding: 5, width: 130 }} value={editingInvoice.newDate} onChange={e => setEditingInvoice({ ...editingInvoice, newDate: e.target.value })} />
                 <input className={styles.input} style={{ padding: 5, width: 100 }} value={editingInvoice.newRef} onChange={e => setEditingInvoice({ ...editingInvoice, newRef: e.target.value })} placeholder="Nuevo Nº" />
                 <button className="btn btn-primary" style={{ padding: '5px 12px' }} onClick={handleSaveInvoiceEdit}>Guardar Todos</button>
                 <button className="btn btn-icon" onClick={() => setEditingInvoice(null)}>✕</button>
               </div>
             )}
          </div>
          <table className={styles.table}>
            <thead><tr><th>Fecha</th><th>Ref</th><th>Operación</th><th>Producto</th><th style={{ textAlign: 'center' }}>Pedido</th><th style={{ textAlign: 'center' }}>Real</th><th style={{ textAlign: 'center' }}>Saldo</th></tr></thead>
            <tbody>
              {filteredMovs.slice(0, 50).map(m => {
                const pend = (m.cantidad_solicitada || m.cantidad) - m.cantidad;
                return (
                  <tr key={m.id} style={editingInvoice?.oldRef === m.referencia ? { background: '#fffbeb' } : {}}>
                    <td style={{ fontSize: 12 }}>{m.fecha}</td>
                    <td style={{ fontWeight: 800 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {m.referencia}
                        <button className="btn btn-icon" style={{ fontSize: 10 }} onClick={() => setEditingInvoice({ oldRef: m.referencia, newRef: m.referencia, newDate: m.fecha })}>✏️</button>
                      </div>
                    </td>
                    <td><span className={m.tipo === 'ENTRADA' ? styles.entryTag : styles.exitTag}>{m.tipo}</span></td>
                    <td style={{ fontWeight: 600 }}>{m.item?.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{m.cantidad_solicitada || m.cantidad}</td>
                    <td style={{ textAlign: 'center', fontWeight: 800 }}>{m.cantidad}</td>
                    <td style={{ textAlign: 'center' }}>{pend > 0 ? <span className={styles.pendTag}>{pend} pendiente</span> : <span style={{ color: '#10b981', fontWeight: 800 }}>✓ OK</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
