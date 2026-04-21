import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { sendEmail } from '../services/emailService'
import { supabase } from '../lib/supabase'
import styles from './ComunicadosPage.module.css'

export default function ComunicadosPage({ session }) {
  const [recipients, setRecipients] = useState([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [file, setFile] = useState(null)
  
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState(null)
  const [errors, setErrors] = useState([])

  const fileInputRef = useRef(null)
  const contentInputRef = useRef(null)

  // Handle Excel Upload
  const handleExcelUpload = (e) => {
    const uploadedFile = e.target.files[0]
    if (!uploadedFile) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws)

      // Normalize columns to find emails
      const extracted = data.map(row => {
        // Look for 'CORREO', 'EMAIL', 'Correo electrónico', etc.
        const emailKey = Object.keys(row).find(key => 
          key.toUpperCase() === 'CORREO' || 
          key.toUpperCase() === 'EMAIL' || 
          key.toLowerCase().includes('correo')
        )
        const nameKey = Object.keys(row).find(key => 
          key.toUpperCase() === 'NOMBRE' || 
          key.toLowerCase().includes('nombre')
        )

        return {
          email: row[emailKey] || '',
          name: row[nameKey] || 'Colaborador'
        }
      }).filter(r => r.email && r.email.includes('@'))

      setRecipients(extracted)
      if (extracted.length === 0) {
        setStatus({ type: 'error', text: 'No se encontraron correos válidos en el archivo.' })
      } else {
        setStatus({ type: 'success', text: `Se cargaron ${extracted.length} destinatarios correctamente.` })
      }
    }
    reader.readAsBinaryString(uploadedFile)
  }

  // Handle Send All
  const handleSendAll = async () => {
    if (recipients.length === 0) return
    if (!subject || (!message && !file)) {
      setStatus({ type: 'error', text: 'Por favor ingresa un asunto y un mensaje (o carga un archivo).' })
      return
    }

    setSending(true)
    setProgress(0)
    setErrors([])
    setStatus({ type: 'info', text: 'Preparando envío...' })

    let finalMessage = message

    // Si hay archivo, subirlo a Supabase Storage primero
    if (file) {
      setStatus({ type: 'info', text: 'Subiendo archivo adjunto...' })
      const fileName = `adjunto_${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('comunicados')
        .upload(fileName, file)

      if (uploadError) {
        setStatus({ type: 'error', text: `Error subiendo archivo: ${uploadError.message}. ¿Creaste el bucket "comunicados"?` })
        setSending(false)
        return
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage.from('comunicados').getPublicUrl(fileName)
      
      // Agregar botón de descarga al final del mensaje (HTML puro para EmailJS)
      finalMessage += `
        <br><br>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${urlData.publicUrl}" style="background-color: #0369a1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            📥 Descargar Documento Adjunto
          </a>
        </div>
      `
    }

    let sentCount = 0
    const total = recipients.length

    for (let i = 0; i < total; i++) {
        const recipient = recipients[i]
        try {
            await sendEmail({
                to_email: recipient.email,
                to_name: recipient.name,
                subject: subject,
                message: finalMessage,
                attachment: null // Ya no enviamos attachment a EmailJS
            })
            sentCount++
        } catch (err) {
            console.error(`Error sending to ${recipient.email}:`, err)
            setErrors(prev => [...prev, recipient.email])
        }
        setProgress(Math.round(((i + 1) / total) * 100))
    }

    setSending(false)
    setStatus({ 
        type: 'success', 
        text: `Proceso finalizado. Enviados: ${sentCount} de ${total}.` 
    })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Comunicados Masivos</h1>
        <p className={styles.sub}>Envía correos electrónicos a una lista cargada desde Excel.</p>
      </header>

      <div className={styles.grid}>
        {/* Left: Setup Recipients */}
        <div className="card">
          <h2 className={styles.cardTitle}><span>📊</span> 1. Cargar Destinatarios</h2>
          
          <input 
            type="file" accept=".xlsx, .xls" 
            style={{ display: 'none' }} 
            ref={fileInputRef}
            onChange={handleExcelUpload}
          />
          
          <div className={styles.dropzone} onClick={() => fileInputRef.current.click()}>
            <span className={styles.dropzoneIcon}>📁</span>
            <span className={styles.dropzoneText}>Pulsa para subir Excel</span>
            <span className={styles.dropzoneSub}>Formatos soportados: .xlsx, .xls</span>
          </div>

          {recipients.length > 0 && (
            <div className={styles.recipientList}>
              <div className={styles.recipientItem} style={{ fontWeight: 'bold', background: '#f8fafc' }}>
                <span>Nombre</span>
                <span>Correo</span>
              </div>
              {recipients.map((r, idx) => (
                <div key={idx} className={styles.recipientItem}>
                  <span>{r.name}</span>
                  <span className={styles.emailBadge}>{r.email}</span>
                </div>
              ))}
            </div>
          )}
          
          {recipients.length === 0 && (
            <div className={styles.empty}>Sube un archivo para ver los destinatarios aquí.</div>
          )}
        </div>

        {/* Right: Write Message */}
        <div className="card">
          <h2 className={styles.cardTitle}><span>✍️</span> 2. Redactar Correo</h2>
          
          <div className={styles.field}>
            <label>Asunto del correo</label>
            <input 
              type="text" className={styles.input} 
              placeholder="Ej: Tutorial de entrega de recursos"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>Contenido del mensaje (Texto u HTML)</label>
            <textarea 
              className={styles.textarea}
              placeholder="Escribe el mensaje aquí..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>Opcional: Cargar archivo (Adjunto o Plantilla)</label>
            <input 
              type="file" 
              className={styles.input}
              onChange={e => setFile(e.target.files[0])}
            />
          </div>

          <button 
            className={`btn btn-primary ${styles.btnSend}`}
            disabled={sending || recipients.length === 0}
            onClick={handleSendAll}
          >
            {sending ? '🚀 Enviando...' : '✉ Enviar a todos'}
          </button>

          {status && (
            <div className={status.type === 'error' ? 'alert alert-error' : styles.success}>
              {status.type === 'success' ? '✅' : '❌'} {status.text}
            </div>
          )}

          {sending && (
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
              </div>
              <div className={styles.progressInfo}>
                <span>Progreso: {progress}%</span>
                <span>{Math.round((progress / 100) * recipients.length)} de {recipients.length}</span>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div style={{ marginTop: 12, color: 'var(--danger)', fontSize: 12 }}>
                ⚠️ No se pudo enviar a: {errors.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
