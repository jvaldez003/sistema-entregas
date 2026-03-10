import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import LoginPage    from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import NuevaEntregaPage from './pages/NuevaEntregaPage'
import RegistrosPage    from './pages/RegistrosPage'
import ReportePage      from './pages/ReportePage'
import AdminPage        from './pages/AdminPage'
import Layout           from './components/Layout'

function RequireAuth({ session, children }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text2)' }}>
        <div style={{ textAlign:'center' }}>
          <div className="spinner" />
          <p style={{ marginTop:12 }}>Cargando…</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <RequireAuth session={session}>
          <Layout session={session} />
        </RequireAuth>
      }>
        <Route index element={<DashboardPage session={session} />} />
        <Route path="nueva"    element={<NuevaEntregaPage session={session} />} />
        <Route path="registros" element={<RegistrosPage session={session} />} />
        <Route path="reporte"  element={<ReportePage session={session} />} />
        <Route path="admin"    element={<AdminPage session={session} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
