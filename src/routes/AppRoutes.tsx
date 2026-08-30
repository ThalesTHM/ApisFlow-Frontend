import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AuthPage } from '../auth/AuthPage'
import { AppShell } from '../components/AppShell'
import { ApiariesPage } from '../features/apiaries/ApiariesPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { HivesPage } from '../features/hives/HivesPage'
import { HoneyBatchesPage } from '../features/honey-batches/HoneyBatchesPage'
import { OrdersPage } from '../features/orders/OrdersPage'
import { ProductionCyclesPage } from '../features/production-cycles/ProductionCyclesPage'
import { UsersPage } from '../features/users/UsersPage'
import { ProtectedRoute } from './ProtectedRoute'

function ProtectedLayout() { return <AppShell><Outlet /></AppShell> }

export function AppRoutes() {
  const { session } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/apiaries" element={<ApiariesPage />} />
          <Route path="/hives" element={<HivesPage />} />
          <Route path="/production-cycles" element={<ProductionCyclesPage />} />
          <Route path="/honey-batches" element={<HoneyBatchesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
    </Routes>
  )
}