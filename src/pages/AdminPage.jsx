import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './AdminPage.module.css'

export default function AdminPage({ session }) {
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [msg, setMsg]       = useState({ type:'', text:'' })
  const [loading, setLoading] = useState(false)
  const [users, setUsers]   = useState([])

  // Note: listing users requires service_role key (not available client-side)
  // We store a local profiles table instead
  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setUsers(data || []))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setMsg({ type:'', text:'' })
    setLoading(true)
    const { error } = await supabase.auth.admin.createUser
      ? { error: { message: 'Usa el Panel de Supabase para crear usuarios.' } }
      : { error: null }

    // Since admin API requires service key, guide user instead
    setLoading(false)
    setMsg({
      type: 'info',
      text: `Para crear el usuario "${email}" ve a tu Panel de Supabase → Authentication → Users → "Invite user" o "Add user". Ingresa el correo y contraseña desde allí.`
    })
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Gestión de usuarios</h1>
      <p className={styles.sub}>Los usuarios deben crearse desde el panel de Supabase.</p>

      <div className={`card ${styles.card}`}>
        <h2 className={styles.cardTitle}>¿Cómo agregar un nuevo usuario?</h2>
        <ol className={styles.steps}>
          <li>Entra a <strong>supabase.com</strong> → tu proyecto → <strong>Authentication</strong> → <strong>Users</strong></li>
          <li>Haz clic en <strong>"Add user"</strong> → <strong>"Create new user"</strong></li>
          <li>Ingresa el correo y contraseña del nuevo compañero</li>
          <li>El usuario ya puede iniciar sesión en el sistema</li>
        </ol>

        <div className={styles.note}>
          <span>💡</span>
          <span>Supabase permite hasta <strong>50,000 usuarios activos gratis</strong>. Para tu equipo de 6–20 personas está más que suficiente.</span>
        </div>
      </div>

      <div className={`card ${styles.card}`} style={{ marginTop: 16 }}>
        <h2 className={styles.cardTitle}>Tu sesión actual</h2>
        <div className={styles.userRow}>
          <div className={styles.avatar}>{session?.user?.email?.slice(0,2).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{session?.user?.email}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>ID: {session?.user?.id}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
