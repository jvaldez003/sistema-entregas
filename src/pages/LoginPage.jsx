import { useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './LoginPage.module.css'

function Logo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4fc3f7" />
          <stop offset="100%" stopColor="#81d4fa" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#1e3a5f" />
      <rect x="10" y="12" width="44" height="28" rx="4" fill="none" stroke="white" strokeWidth="2.5" />
      <line x1="32" y1="40" x2="32" y2="48" stroke="white" strokeWidth="2.5" />
      <line x1="22" y1="48" x2="42" y2="48" stroke="white" strokeWidth="2.5" />
      <polyline points="20,26 28,34 44,18" fill="none" stroke="url(#lg)"
        strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
        <h1 className={styles.title}>Sistema de Entregas</h1>
        <p className={styles.sub}>Recursos Tecnológicos · Multicampus</p>

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