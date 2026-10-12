import { describe, expect, it } from 'vitest'
import { hasPermission, type Permission } from './permissions'

const permissions: Permission[] = [
  'dashboard:read',
  'operations:read',
  'operations:write',
  'orders:manage-status',
  'users:read',
  'users:write',
]

describe('role permissions', () => {
  it('grants administrators every application permission', () => {
    expect(permissions.every((permission) => hasPermission('ADMIN', permission))).toBe(true)
  })

  it('limits managers to read-only user access', () => {
    expect(hasPermission('MANAGER', 'operations:write')).toBe(true)
    expect(hasPermission('MANAGER', 'orders:manage-status')).toBe(true)
    expect(hasPermission('MANAGER', 'users:read')).toBe(true)
    expect(hasPermission('MANAGER', 'users:write')).toBe(false)
  })

  it('keeps operators read-only and outside user management', () => {
    expect(hasPermission('OPERATOR', 'dashboard:read')).toBe(true)
    expect(hasPermission('OPERATOR', 'operations:read')).toBe(true)
    expect(hasPermission('OPERATOR', 'operations:write')).toBe(false)
    expect(hasPermission('OPERATOR', 'orders:manage-status')).toBe(false)
    expect(hasPermission('OPERATOR', 'users:read')).toBe(false)
  })
})