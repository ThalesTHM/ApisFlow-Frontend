import { useAuth } from './useAuth'
import { hasPermission, type Permission } from './permissions'

export function usePermission(permission: Permission): boolean {
  const { session } = useAuth()
  return hasPermission(session?.user.role, permission)
}