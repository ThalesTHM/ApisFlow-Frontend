import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AuthPage } from '../auth/AuthPage'
import { AppShell } from '../components/AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { RoutePlaceholder } from './RoutePlaceholder'

function ProtectedLayout() { return <AppShell><Outlet /></AppShell> }

export function AppRoutes() {
  const { session } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
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
      <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
    </Routes>
  )
}