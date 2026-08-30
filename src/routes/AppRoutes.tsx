import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LoginPage, RegisterPage } from '../auth/AuthPage'
import { AppShell } from '../components/AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { RoutePlaceholder } from './RoutePlaceholder'

function ProtectedLayout() { return <AppShell><Outlet /></AppShell> }

export function AppRoutes() {
  const { status } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={status === 'loading' ? <main className="page"><p>Validando sessão…</p></main> : status === 'authenticated' ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={status === 'loading' ? <main className="page"><p>Validando sessão…</p></main> : status === 'authenticated' ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<RoutePlaceholder title="Visão geral" />} />
          <Route path="/apiaries" element={<RoutePlaceholder title="Apiários" />} />
          <Route path="/hives" element={<RoutePlaceholder title="Colmeias" />} />
          <Route path="/production-cycles" element={<RoutePlaceholder title="Ciclos de produção" />} />
          <Route path="/honey-batches" element={<RoutePlaceholder title="Lotes de mel" />} />
          <Route path="/orders" element={<RoutePlaceholder title="Pedidos" />} />
          <Route path="/users" element={<RoutePlaceholder title="Usuários" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={status === 'authenticated' ? '/' : '/login'} replace />} />
    </Routes>
  )
}