import { Navigate, Outlet } from 'react-router-dom'
import type { Permission } from '../auth/permissions'
import { usePermission } from '../auth/usePermission'

export function PermissionRoute({ permission }: { permission: Permission }) {
  return usePermission(permission) ? <Outlet /> : <Navigate to="/forbidden" replace />
}