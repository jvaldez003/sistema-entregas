import { useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

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
        <div className={styles.iconWrap}>
          <span className={styles.icon}>📦</span>
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
            style={{ width:'100%', justifyContent:'center', padding:'11px' }}>
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
