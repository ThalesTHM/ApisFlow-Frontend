import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LoginPage, RegisterPage } from '../auth/AuthPage'
import { AppShell } from '../components/AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { PermissionRoute } from './PermissionRoute'
import { RoutePlaceholder } from './RoutePlaceholder'
import { ForbiddenPage } from './ForbiddenPage'
import { ApiaryCreatePage, ApiaryDetailPage, ApiaryEditPage, ApiaryListPage } from '../features/apiaries/ApiaryPages'

function ProtectedLayout() { return <AppShell><Outlet /></AppShell> }

export function AppRoutes() {
  const { status } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={status === 'loading' ? <main className="page"><p>Validando sessão…</p></main> : status === 'authenticated' ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={status === 'loading' ? <main className="page"><p>Validando sessão…</p></main> : status === 'authenticated' ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedLayout />}>
          <Route element={<PermissionRoute permission="dashboard:read" />}><Route path="/" element={<RoutePlaceholder title="Dashboard" />} /></Route>
          <Route element={<PermissionRoute permission="operations:read" />}>
            <Route path="/apiaries" element={<ApiaryListPage />} />
            <Route path="/apiaries/:id" element={<ApiaryDetailPage />} />
            <Route element={<PermissionRoute permission="operations:write" />}>
              <Route path="/apiaries/new" element={<ApiaryCreatePage />} />
              <Route path="/apiaries/:id/edit" element={<ApiaryEditPage />} />
            </Route>
            <Route path="/hives" element={<RoutePlaceholder title="Colmeias" />} />
            <Route path="/production-cycles" element={<RoutePlaceholder title="Ciclos de produção" />} />
            <Route path="/honey-batches" element={<RoutePlaceholder title="Lotes de mel" />} />
            <Route path="/orders" element={<RoutePlaceholder title="Pedidos" />} />
          </Route>
          <Route element={<PermissionRoute permission="users:read" />}><Route path="/users" element={<RoutePlaceholder title="Usuários" />} /></Route>
          <Route path="/forbidden" element={<ForbiddenPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={status === 'authenticated' ? '/' : '/login'} replace />} />
    </Routes>
  )
}