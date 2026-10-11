import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Spinner } from '../components/ui'

export function ProtectedRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <main className="page"><Spinner label="Validando sessão" /></main>
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />
}