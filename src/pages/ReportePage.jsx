import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import styles from './ReportePage.module.css'

// Logo Candelaria embebido como URL pública (sin datos institucionales en el código)
const LOGO_URL = '/logo_candelaria.png'

export default function ReportePage() {
  const [periodo, setPeriodo]     = useState('')
  const [rows, setRows]           = useState([])
  const [loaded, setLoaded]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [obsGen, setObsGen]       = useState('')
  const printRef = useRef()

  async function buscar() {
    if (!periodo) return
    setLoading(true)
    const [year, month] = periodo.split('-')
    const start = `${year}-${month}-01`
    const end   = new Date(year, parseInt(month), 0).toISOString().slice(0,10)

    const { data } = await supabase
      .from('entregas')
      .select('*')
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: true })

    setRows(data || [])
    setLoaded(true)
    setLoading(false)
  }

  function printReport() {
    const printWin = window.open('', '_blank', 'width=1100,height=800')
    const periodoLabel = periodo
      ? new Date(periodo + '-15').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
      : ''

    // Build rows HTML
    const TOTAL_ROWS = 15
    const emptyCount = Math.max(0, TOTAL_ROWS - rows.length)
    const dataRows = rows.map((r, i) => `
      <tr style="background:${i%2===0?'#f5f6f8':'#ffffff'}">
        <td style="text-align:center;font-weight:700">${i+1}</td>
        <td style="text-align:center">${r.fecha || ''}</td>
        <td>${r.docente || ''}</td>
        <td>${r.recurso || ''}</td>
        <td style="text-align:center">${r.aula || ''}</td>
        <td style="text-align:center">${r.horario || ''}</td>
        <td style="text-align:center">${r.dia || ''}</td>
        <td>${r.quien_entrega || ''}</td>
        <td>${r.firma_quien_recibe || ''}</td>
      </tr>`).join('')

    const emptyRows = Array(emptyCount).fill(0).map((_, i) => `
      <tr style="background:${(rows.length+i)%2===0?'#f5f6f8':'#ffffff'}">
        <td style="text-align:center;color:#ccc">${rows.length+i+1}</td>
        <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>`).join('')

    printWin.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8"/>
      <title>Reporte Entregas - ${periodoLabel}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #000; background: #fff; }

        /* ── ENCABEZADO ── */
        .header-box {
          border: 1.5px solid #000;
          display: flex; align-items: stretch;
          margin-bottom: 0;
        }
        .header-logo {
          width: 90px; min-height: 80px;
          border-right: 1.5px solid #000;
          display: flex; align-items: center; justify-content: center;
          padding: 6px;
          flex-shrink: 0;
        }
        .header-logo img { max-width: 75px; max-height: 70px; object-fit: contain; }
        .header-titles {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 8px 16px;
        }
        .header-org {
          font-size: 13px; font-weight: 700; text-align: center; line-height: 1.4;
        }

        /* ── SUBTÍTULO ── */
        .subtitle-row {
          border: 1.5px solid #000; border-top: none;
          padding: 6px 10px; text-align: center;
          font-size: 11px; font-weight: 700;
        }

        /* ── INFO ROW ── */
        .info-row {
          display: flex;
          border: 1.5px solid #000; border-top: none;
        }
        .info-cell {
          padding: 5px 10px; font-size: 10px;
          display: flex; align-items: center; gap: 6px;
        }
        .info-cell.label { background: #d9d9d9; font-weight: 700; flex-shrink: 0; }
        .info-cell.value { flex: 1; border-right: 1px solid #ccc; }
        .info-cell.value:last-child { border-right: none; }

        /* ── TABLA ── */
        table {
          width: 100%; border-collapse: collapse;
          border: 1.5px solid #000; border-top: none;
        }
        th {
          background: #d9d9d9; font-weight: 700;
          font-size: 9px; text-transform: uppercase;
          padding: 5px 4px; text-align: center;
          border: 1px solid #999;
        }
        td {
          padding: 0 4px; height: 22px;
          border: 1px solid #ccc; vertical-align: middle;
          font-size: 9px;
        }

        /* ── TOTAL ── */
        .total-row td {
          background: #d9d9d9; font-weight: 700;
          font-size: 10px; border: 1px solid #999;
        }

        /* ── OBSERVACIONES ── */
        .obs-label {
          border: 1.5px solid #000; border-top: none;
          padding: 5px 10px;
          background: #d9d9d9; font-weight: 700; font-size: 10px;
        }
        .obs-box {
          border: 1.5px solid #000; border-top: none;
          min-height: 50px; padding: 6px 10px;
          font-size: 10px; white-space: pre-wrap;
        }

        /* ── FIRMA ── */
        .firma-wrap {
          margin-top: 14px;
          display: flex; justify-content: center;
        }
        .firma-box {
          width: 260px; text-align: center;
        }
        .firma-line {
          border-bottom: 1.5px solid #000;
          height: 44px; margin-bottom: 5px;
        }
        .firma-label {
          background: #d9d9d9; border: 1px solid #999;
          font-weight: 700; font-size: 10px; padding: 4px 8px;
        }
      </style>
    </head><body>

      <!-- ENCABEZADO -->
      <div class="header-box">
        <div class="header-logo">
          <img src="${window.location.origin}/logo_candelaria.png" alt="Logo" onerror="this.style.display='none'" />
        </div>
        <div class="header-titles">
          <div class="header-org">ALCALDÍA DE CANDELARIA<br>VALLE DEL CAUCA, COLOMBIA</div>
        </div>
      </div>

      <!-- SUBTÍTULO -->
      <div class="subtitle-row">ENTREGA DE RECURSOS TECNOLÓGICOS MULTICAMPUS UNIVERSITARIO</div>

      <!-- PERÍODO Y SUBPROGRAMA -->
      <div class="info-row">
        <div class="info-cell label">PERÍODO →</div>
        <div class="info-cell value" style="min-width:200px;font-weight:600;font-size:11px">${periodoLabel}</div>
        <div class="info-cell label">SUBPROGRAMA</div>
        <div class="info-cell value">Accesos a la educación superior Candelaria Valle del Cauca</div>
      </div>

      <!-- TABLA -->
      <table>
        <thead>
          <tr>
            <th style="width:28px">#</th>
            <th style="width:68px">FECHA</th>
            <th style="width:18%">DOCENTE / SOLICITANTE</th>
            <th style="width:14%">RECURSO TECNOLÓGICO</th>
            <th style="width:40px">AULA</th>
            <th style="width:55px">HORARIO</th>
            <th style="width:60px">DÍA</th>
            <th style="width:16%">NOMBRE DE QUIEN ENTREGA</th>
            <th style="width:12%">FIRMA</th>
          </tr>
        </thead>
        <tbody>
          ${dataRows}
          ${emptyRows}
          <tr class="total-row">
            <td colspan="8" style="text-align:right;padding-right:10px">TOTAL REGISTROS</td>
            <td style="text-align:center;font-size:12px">${rows.length}</td>
          </tr>
        </tbody>
      </table>

      <!-- OBSERVACIONES -->
      <div class="obs-label">OBSERVACIONES</div>
      <div class="obs-box">${obsGen.replace(/\n/g,'<br>')}</div>

      <!-- FIRMA -->
      <div class="firma-wrap">
        <div class="firma-box">
          <div class="firma-line"></div>
          <div class="firma-label">PROFESIONAL DE APOYO</div>
        </div>
      </div>

    </body></html>`)
    printWin.document.close()
    setTimeout(() => printWin.print(), 400)
  }

  const periodoLabel = periodo
    ? new Date(periodo + '-15').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reporte mensual</h1>
          <p className={styles.sub}>Genera el formato de impresión por período</p>
        </div>
      </div>

      {/* Selector */}
      <div className={`card ${styles.selectorCard}`}>
        <div className={styles.selectorRow}>
          <div className={styles.field}>
            <label className={styles.label}>Período (mes y año)</label>
            <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
              style={{ maxWidth: 200 }} />
          </div>
          <button className="btn btn-primary" onClick={buscar} disabled={!periodo || loading}>
            {loading ? 'Buscando…' : '🔍 Buscar registros'}
          </button>
        </div>

        <div className={styles.field} style={{ marginTop: 16 }}>
          <label className={styles.label}>Observaciones generales (aparecerán en el reporte)</label>
          <textarea rows={3} value={obsGen} onChange={e => setObsGen(e.target.value)}
            placeholder="Notas del período, incidencias, aclaraciones…" />
        </div>
      </div>

      {/* Preview */}
      {loaded && (
        <>
          <div className={styles.previewHeader}>
            <div>
              <span className={styles.periodLabel}>{periodoLabel}</span>
              <span className={styles.countBadge}>{rows.length} registro{rows.length!==1?'s':''}</span>
            </div>
            <button className="btn btn-primary" onClick={printReport} disabled={!loaded}>
              ⎙ Imprimir / Guardar PDF
            </button>
          </div>

          {rows.length === 0 ? (
            <div className={`card ${styles.empty}`}>
              No hay registros para el período seleccionado.
            </div>
          ) : (
            <div className="card" style={{ overflow:'hidden' }}>
              <div style={{ overflowX:'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th><th>Fecha</th><th>Docente / Solicitante</th>
                      <th>Recurso</th><th>Aula</th><th>Horario</th><th>Día</th>
                      <th>Quien entrega</th><th>Firma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id}>
                        <td className={styles.num}>{i+1}</td>
                        <td>{r.fecha}</td>
                        <td>{r.docente}</td>
                        <td><span className="badge badge-blue">{r.recurso}</span></td>
                        <td>{r.aula}</td>
                        <td>{r.horario}</td>
                        <td>{r.dia}</td>
                        <td>{r.quien_entrega || '—'}</td>
                        <td>{r.firma_quien_recibe || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
