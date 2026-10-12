import type { ReactNode } from 'react'
import type { Permission } from './permissions'
import { usePermission } from './usePermission'

export function PermissionGuard({ permission, children, fallback = null }: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  return usePermission(permission) ? children : fallback
}