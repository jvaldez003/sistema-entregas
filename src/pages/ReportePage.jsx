import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './ReportePage.module.css'

const LOGO_URL = '/logo_candelaria.png'

function buildPrintHTML({ filas, titulo, subtitulo, periodoLabel, firmante, observaciones, logoUrl }) {
  const ROWS_PER_PAGE = 10
  const pages = filas.length === 0 ? [[]] : []
  for (let i = 0; i < filas.length; i += ROWS_PER_PAGE) pages.push(filas.slice(i, i + ROWS_PER_PAGE))

  const fmtFecha = f => {
    if (!f) return ''
    const [y, m, d] = f.split('-').map(Number)
    const meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${d.toString().padStart(2, '0')} ${meses[m]} ${y}`
  }

  function buildHeader(pageNum, totalPages) {
    return `
    <div class="header-box">
      <div class="header-logo">
        <img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />
      </div>
      <div class="header-titles">
        <div class="header-org">ALCALDÍA DE CANDELARIA — VALLE DEL CAUCA, COLOMBIA</div>
        <div class="header-doc">${titulo}</div>
        ${subtitulo ? `<div class="header-sub">${subtitulo}</div>` : ''}
      </div>
      ${totalPages > 1 ? `<div class="page-num">Pág. ${pageNum}/${totalPages}</div>` : ''}
    </div>
    <div class="info-row">
      <div class="info-cell label">PERÍODO</div>
      <div class="info-cell value">${periodoLabel}</div>
      <div class="info-cell label">SUBPROGRAMA</div>
      <div class="info-cell value">Accesos a la educación superior — Candelaria Valle del Cauca</div>
    </div>`
  }

  const tableHead = `
    <table>
      <thead><tr>
        <th style="width:28px">#</th>
        <th style="width:68px">FECHA</th>
        <th style="width:18%">DOCENTE / SOLICITANTE</th>
        <th style="width:14%">RECURSO</th>
        <th style="width:40px">AULA</th>
        <th style="width:55px">HORARIO</th>
        <th style="width:60px">DÍA</th>
        <th style="width:16%">QUIEN ENTREGA</th>
        <th style="width:12%">FIRMA</th>
      </tr></thead>`

  const pagesHTML = pages.map((pageRows, pi) => {
    const startNum = pi * ROWS_PER_PAGE
    const isLast = pi === pages.length - 1
    const emptyCount = Math.max(0, ROWS_PER_PAGE - pageRows.length)

    const dataRows = pageRows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#f5f6f8' : '#fff'}">
        <td style="text-align:center;font-weight:700">${startNum + i + 1}</td>
        <td style="text-align:center">${fmtFecha(r.fecha)}</td>
        <td>${r.docente || ''}</td>
        <td>${r.recurso || ''}</td>
        <td style="text-align:center">${r.aula || ''}</td>
        <td style="text-align:center">${r.horario || ''}</td>
        <td style="text-align:center">${r.dia || ''}</td>
        <td>${r.quien_entrega || ''}</td>
        <td></td>
      </tr>`).join('')

    const emptyRows = Array(emptyCount).fill(0).map((_, i) => `
      <tr style="background:${(pageRows.length + i) % 2 === 0 ? '#f5f6f8' : '#fff'}">
        <td style="text-align:center;color:#ccc">${startNum + pageRows.length + i + 1}</td>
        <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>`).join('')

    return `
    <div class="${isLast ? 'page' : 'page page-break'}">
      ${buildHeader(pi + 1, pages.length)}
      ${tableHead}
        <tbody>
          ${dataRows}${emptyRows}
          ${isLast ? `
          <tr class="total-row">
            <td colspan="8" style="text-align:right;padding-right:10px">TOTAL REGISTROS</td>
            <td style="text-align:center;font-size:12px">${filas.length}</td>
          </tr>` : ''}
        </tbody>
      </table>
      ${isLast ? `
      <div class="obs-label">OBSERVACIONES</div>
      <div class="obs-box">${(observaciones || '').replace(/\n/g, '<br>')}</div>
      <div class="firma-wrap">
        <div class="firma-box">
          <div class="firma-line"></div>
          <div class="firma-label">${firmante || 'PROFESIONAL DE APOYO'}</div>
        </div>
      </div>` : ''}
    </div>`
  }).join('')

  return `<!DOCTYPE html><html lang="es"><head>
  <meta charset="UTF-8"/>
  <title>${titulo}</title>
  <style>
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; box-sizing:border-box; margin:0; padding:0; }
    @page { size: A4 landscape; margin: 8mm; }
    @media print { html,body { width:277mm; } }
    body { font-family:Arial,sans-serif; font-size:10px; color:#000; background:#fff; }
    .page { width:100%; }
    .page-break { page-break-after:always; }
    .header-box { border:1.5px solid #000; display:flex; align-items:stretch; }
    .header-logo { width:80px; min-height:70px; border-right:1.5px solid #000; display:flex; align-items:center; justify-content:center; padding:4px; flex-shrink:0; }
    .header-logo img { max-width:68px; max-height:62px; object-fit:contain; }
    .header-titles { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:6px 16px; }
    .header-org { font-size:11px; font-weight:700; text-align:center; }
    .header-doc { font-size:10px; font-weight:700; text-align:center; margin-top:3px; text-transform:uppercase; }
    .header-sub { font-size:9px; color:#555; text-align:center; margin-top:2px; }
    .page-num { padding:0 10px; font-size:9px; color:#555; display:flex; align-items:center; flex-shrink:0; border-left:1px solid #ccc; }
    .info-row { display:flex; border:1.5px solid #000; border-top:none; }
    .info-cell { padding:5px 10px; font-size:10px; display:flex; align-items:center; gap:6px; }
    .info-cell.label { background:#d9d9d9; font-weight:700; flex-shrink:0; }
    .info-cell.value { flex:1; border-right:1px solid #ccc; }
    .info-cell.value:last-child { border-right:none; }
    table { width:100%; border-collapse:collapse; border:1.5px solid #000; border-top:none; }
    th { background:#d9d9d9; font-weight:700; font-size:9px; text-transform:uppercase; padding:5px 4px; text-align:center; border:1px solid #999; }
    td { padding:0 6px; height:30px; border:1px solid #ccc; vertical-align:middle; font-size:9px; }
    .total-row td { background:#d9d9d9; font-weight:700; font-size:10px; border:1px solid #999; }
    .obs-label { border:1.5px solid #000; border-top:none; padding:5px 10px; background:#d9d9d9; font-weight:700; font-size:10px; }
    .obs-box { border:1.5px solid #000; border-top:none; min-height:36px; padding:5px 10px; font-size:10px; white-space:pre-wrap; }
    .firma-wrap { margin-top:10px; display:flex; justify-content:center; }
    .firma-box { width:240px; text-align:center; }
    .firma-line { border-bottom:1.5px solid #000; height:36px; margin-bottom:4px; }
    .firma-label { background:#d9d9d9; border:1px solid #999; font-weight:700; font-size:10px; padding:4px 8px; }
  </style>
  </head><body>${pagesHTML}</body></html>`
}

export default function ReportePage() {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [obsGen, setObsGen] = useState('')
  const [firmante, setFirmante] = useState('PROFESIONAL DE APOYO')
  const [personas, setPersonas] = useState([])  // lista única de quien_entrega

  async function buscar() {
    if (!fechaInicio || !fechaFin) return
    setLoading(true)
    const { data } = await supabase
      .from('entregas')
      .select('*')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('fecha', { ascending: true })
    const filas = data || []
    setRows(filas)
    // Extraer personas únicas con registros
    const ps = [...new Set(filas.map(r => r.quien_entrega).filter(Boolean))].sort()
    setPersonas(ps)
    setLoaded(true)
    setLoading(false)
  }

  function fmtRango() {
    if (!fechaInicio || !fechaFin) return '—'
    const fmtD = f => {
      const [y, m, d] = f.split('-').map(Number)
      const meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      return `${d.toString().padStart(2, '0')} ${meses[m]} ${y}`
    }
    return `${fmtD(fechaInicio)} — ${fmtD(fechaFin)}`
  }

  function imprimirGeneral() {
    const win = window.open('', '_blank', 'width=1100,height=800')
    const html = buildPrintHTML({
      filas: rows,
      titulo: 'ENTREGA DE RECURSOS TECNOLÓGICOS',
      subtitulo: 'REPORTE GENERAL — MULTICAMPUS UNIVERSITARIO',
      periodoLabel: fmtRango(),
      firmante,
      observaciones: obsGen,
      logoUrl: window.location.origin + '/logo_candelaria.png',
    })
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  function imprimirPersona(persona) {
    const filas = rows.filter(r => r.quien_entrega === persona)
    const win = window.open('', '_blank', 'width=1100,height=800')
    const html = buildPrintHTML({
      filas,
      titulo: 'ENTREGA DE RECURSOS TECNOLÓGICOS',
      subtitulo: `REPORTE INDIVIDUAL — ${persona.toUpperCase()}`,
      periodoLabel: fmtRango(),
      firmante,
      observaciones: '',
      logoUrl: window.location.origin + '/logo_candelaria.png',
    })
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  function imprimirTodosIndividual() {
    if (personas.length === 0) return
    const win = window.open('', '_blank', 'width=1100,height=800')

    // Construir un HTML con todas las personas, cada una con page-break
    const fmtD = f => {
      if (!f) return ''
      const [y, m, d] = f.split('-').map(Number)
      const meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      return `${d.toString().padStart(2, '0')} ${meses[m]} ${y}`
    }

    const allHTML = personas.map((persona, pidx) => {
      const filas = rows.filter(r => r.quien_entrega === persona)
      const isLast = pidx === personas.length - 1
      const ROWS_PER_PAGE = 10
      const pages = []
      for (let i = 0; i < filas.length; i += ROWS_PER_PAGE) pages.push(filas.slice(i, i + ROWS_PER_PAGE))
      if (pages.length === 0) pages.push([])

      return pages.map((pageRows, pi) => {
        const startNum = pi * ROWS_PER_PAGE
        const isLastPage = pi === pages.length - 1
        const isVeryLast = isLast && isLastPage
        const emptyCount = Math.max(0, ROWS_PER_PAGE - pageRows.length)

        const dataRows = pageRows.map((r, i) => `
          <tr style="background:${i % 2 === 0 ? '#f5f6f8' : '#fff'}">
            <td style="text-align:center;font-weight:700">${startNum + i + 1}</td>
            <td style="text-align:center">${fmtD(r.fecha)}</td>
            <td>${r.docente || ''}</td>
            <td>${r.recurso || ''}</td>
            <td style="text-align:center">${r.aula || ''}</td>
            <td style="text-align:center">${r.horario || ''}</td>
            <td style="text-align:center">${r.dia || ''}</td>
            <td>${r.quien_entrega || ''}</td>
            <td></td>
          </tr>`).join('')

        const emptyRows = Array(emptyCount).fill(0).map((_, i) => `
          <tr style="background:${(pageRows.length + i) % 2 === 0 ? '#f5f6f8' : '#fff'}">
            <td style="text-align:center;color:#ccc">${startNum + pageRows.length + i + 1}</td>
            <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          </tr>`).join('')

        return `
        <div class="${isVeryLast ? 'page' : 'page page-break'}">
          <div class="header-box">
            <div class="header-logo">
              <img src="${window.location.origin}/logo_candelaria.png" alt="Logo" onerror="this.style.display='none'" />
            </div>
            <div class="header-titles">
              <div class="header-org">ALCALDÍA DE CANDELARIA — VALLE DEL CAUCA, COLOMBIA</div>
              <div class="header-doc">ENTREGA DE RECURSOS TECNOLÓGICOS</div>
              <div class="header-sub">REPORTE INDIVIDUAL — ${persona.toUpperCase()}</div>
            </div>
            ${pages.length > 1 ? `<div class="page-num">Pág. ${pi + 1}/${pages.length}</div>` : ''}
          </div>
          <div class="info-row">
            <div class="info-cell label">PERÍODO</div>
            <div class="info-cell value">${fmtRango()}</div>
            <div class="info-cell label">COLABORADOR</div>
            <div class="info-cell value" style="font-weight:700">${persona}</div>
          </div>
          <table>
            <thead><tr>
              <th style="width:28px">#</th>
              <th style="width:68px">FECHA</th>
              <th style="width:18%">DOCENTE / SOLICITANTE</th>
              <th style="width:14%">RECURSO</th>
              <th style="width:40px">AULA</th>
              <th style="width:55px">HORARIO</th>
              <th style="width:60px">DÍA</th>
              <th style="width:16%">QUIEN ENTREGA</th>
              <th style="width:12%">FIRMA</th>
            </tr></thead>
            <tbody>
              ${dataRows}${emptyRows}
              ${isLastPage ? `
              <tr class="total-row">
                <td colspan="8" style="text-align:right;padding-right:10px">TOTAL REGISTROS</td>
                <td style="text-align:center;font-size:12px">${filas.length}</td>
              </tr>` : ''}
            </tbody>
          </table>
          ${isLastPage ? `
          <div class="firma-wrap">
            <div class="firma-box">
              <div class="firma-line"></div>
              <div class="firma-label">${firmante || 'PROFESIONAL DE APOYO'}</div>
            </div>
          </div>` : ''}
        </div>`
      }).join('')
    }).join('')

    win.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"/>
    <title>Reportes Individuales — ${fmtRango()}</title>
    <style>
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; box-sizing:border-box; margin:0; padding:0; }
      @page { size: A4 landscape; margin: 8mm; }
      body { font-family:Arial,sans-serif; font-size:10px; color:#000; background:#fff; }
      .page { width:100%; }
      .page-break { page-break-after:always; }
      .header-box { border:1.5px solid #000; display:flex; align-items:stretch; }
      .header-logo { width:80px; min-height:70px; border-right:1.5px solid #000; display:flex; align-items:center; justify-content:center; padding:4px; flex-shrink:0; }
      .header-logo img { max-width:68px; max-height:62px; object-fit:contain; }
      .header-titles { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:6px 16px; }
      .header-org { font-size:11px; font-weight:700; text-align:center; }
      .header-doc { font-size:10px; font-weight:700; text-align:center; margin-top:3px; text-transform:uppercase; }
      .header-sub { font-size:9px; color:#555; text-align:center; margin-top:2px; font-weight:700; }
      .page-num { padding:0 10px; font-size:9px; color:#555; display:flex; align-items:center; flex-shrink:0; border-left:1px solid #ccc; }
      .info-row { display:flex; border:1.5px solid #000; border-top:none; }
      .info-cell { padding:5px 10px; font-size:10px; display:flex; align-items:center; gap:6px; }
      .info-cell.label { background:#d9d9d9; font-weight:700; flex-shrink:0; }
      .info-cell.value { flex:1; border-right:1px solid #ccc; }
      .info-cell.value:last-child { border-right:none; }
      table { width:100%; border-collapse:collapse; border:1.5px solid #000; border-top:none; }
      th { background:#d9d9d9; font-weight:700; font-size:9px; text-transform:uppercase; padding:5px 4px; text-align:center; border:1px solid #999; }
      td { padding:0 6px; height:30px; border:1px solid #ccc; vertical-align:middle; font-size:9px; }
      .total-row td { background:#d9d9d9; font-weight:700; font-size:10px; border:1px solid #999; }
      .firma-wrap { margin-top:10px; display:flex; justify-content:center; }
      .firma-box { width:240px; text-align:center; }
      .firma-line { border-bottom:1.5px solid #000; height:36px; margin-bottom:4px; }
      .firma-label { background:#d9d9d9; border:1px solid #999; font-weight:700; font-size:10px; padding:4px 8px; }
    </style>
    </head><body>${allHTML}</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  const periodoLabel = fmtRango()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reporte de Evidencia</h1>
          <p className={styles.sub}>Genera reportes por rango de fechas — general o por persona</p>
        </div>
      </div>

      {/* Filtros */}
      <div className={`card ${styles.selectorCard}`}>
        <div className={styles.selectorRow}>
          <div className={styles.field}>
            <label className={styles.label}>Fecha inicio</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Fecha fin</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Firmante</label>
            <input type="text" value={firmante} onChange={e => setFirmante(e.target.value)}
              placeholder="Nombre del firmante" style={{ minWidth: 200 }} />
          </div>
          <button className="btn btn-primary" onClick={buscar}
            disabled={!fechaInicio || !fechaFin || loading}>
            {loading ? 'Buscando…' : '🔍 Buscar'}
          </button>
        </div>

        <div className={styles.field} style={{ marginTop: 16 }}>
          <label className={styles.label}>Observaciones generales (para el reporte general)</label>
          <textarea rows={2} value={obsGen} onChange={e => setObsGen(e.target.value)}
            placeholder="Notas del período, incidencias, aclaraciones…" />
        </div>
      </div>

      {/* Resultados */}
      {loaded && (
        <>
          <div className={styles.previewHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={styles.periodLabel}>{periodoLabel}</span>
              <span className={styles.countBadge}>{rows.length} registro{rows.length !== 1 ? 's' : ''}</span>
              {personas.length > 0 &&
                <span className={styles.countBadge} style={{ background: '#e8eef7', color: 'var(--accent)' }}>
                  {personas.length} colaborador{personas.length !== 1 ? 'es' : ''}
                </span>
              }
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={imprimirTodosIndividual} disabled={personas.length === 0}>
                👤 Imprimir todos individual
              </button>
              <button className="btn btn-primary" onClick={imprimirGeneral}>
                ⎙ Reporte general
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className={`card ${styles.empty}`}>
              No hay registros para el rango seleccionado.
            </div>
          ) : (
            <>
              {/* Botones por persona */}
              {personas.length > 0 && (
                <div className={`card ${styles.personasCard}`}>
                  <p className={styles.personasTitle}>📄 Reporte individual por persona</p>
                  <div className={styles.personasBtns}>
                    {personas.map(p => {
                      const count = rows.filter(r => r.quien_entrega === p).length
                      return (
                        <button key={p} className={styles.personaBtn} onClick={() => imprimirPersona(p)}>
                          <span className={styles.personaBtnNombre}>{p}</span>
                          <span className={styles.personaBtnCount}>{count} reg.</span>
                          <span className={styles.personaBtnIcon}>⎙</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tabla preview */}
              <div className="card" style={{ overflow: 'hidden', marginTop: 16 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th><th>Fecha</th><th>Docente / Solicitante</th>
                        <th>Recurso</th><th>Aula</th><th>Horario</th><th>Día</th>
                        <th>Quien entrega</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.id}>
                          <td className={styles.num}>{i + 1}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{r.fecha}</td>
                          <td>{r.docente}</td>
                          <td><span className="badge badge-blue">{r.recurso}</span></td>
                          <td>{r.aula}</td>
                          <td><span className="badge badge-gray">{r.horario}</span></td>
                          <td>{r.dia}</td>
                          <td>{r.quien_entrega || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}