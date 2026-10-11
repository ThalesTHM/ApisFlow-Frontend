import type { UserRole } from '../api/types'

export type Permission =
  | 'dashboard:read'
  | 'operations:read'
  | 'operations:write'
  | 'orders:manage-status'
  | 'users:read'
  | 'users:write'

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  ADMIN: new Set(['dashboard:read', 'operations:read', 'operations:write', 'orders:manage-status', 'users:read', 'users:write']),
  MANAGER: new Set(['dashboard:read', 'operations:read', 'operations:write', 'orders:manage-status', 'users:read']),
  OPERATOR: new Set(['dashboard:read', 'operations:read']),
}

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  return Boolean(role && rolePermissions[role].has(permission))
}