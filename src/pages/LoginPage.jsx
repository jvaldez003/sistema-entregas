import { useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './LoginPage.module.css'

function Logo() {
  return (
    <img
      src="/logo_candelaria.png"
      alt="Alcaldía de Candelaria"
      style={{ width: 90, height: 90, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.2))' }}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message === 'Invalid login credentials'
      ? 'Correo o contraseña incorrectos'
      : error.message)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Logo />
        </div>
        <h1 className={styles.title}>Sistema de Educación Superior</h1>
        <p className={styles.sub}>Alcaldía Municipal de Candelaria · Valle del Cauca</p>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.field}>
            <label>Correo electrónico</label>
            <input
              type="email" value={email} required autoFocus
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@correo.com"
            />
          </div>
          <div className={styles.field}>
            <label>Contraseña</label>
            <input
              type="password" value={password} required
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className={styles.hint}>
          ¿No tienes acceso? Contacta al administrador del sistema.
        </p>
      </div>
    </div>
  )
}