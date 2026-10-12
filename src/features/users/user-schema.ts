import { z } from 'zod'
import type { CreateUserRequest, UpdateUserRequest } from '../../api/types'
import { emailSchema, passwordSchema } from '../../validation/schemas'

const roles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const
const name = z.string().trim().min(2, 'Use pelo menos 2 caracteres.').max(100, 'Use no máximo 100 caracteres.')
const role = z.enum(roles, { message: 'Selecione um perfil.' })

export const createUserSchema = z.object({ name, email: emailSchema, password: passwordSchema, role, isActive: z.enum(['true', 'false']) })
export const editUserSchema = z.object({ name, email: emailSchema, password: z.union([z.literal(''), passwordSchema]), role, isActive: z.enum(['true', 'false']) })

export type UserFormValues = z.infer<typeof editUserSchema>

export function toCreateUserRequest(values: UserFormValues): CreateUserRequest {
  return { name: values.name.trim(), email: values.email.trim(), password: values.password, role: values.role }
}

export function toUpdateUserRequest(values: UserFormValues): UpdateUserRequest {
  const password = values.password.trim()
  return { name: values.name.trim(), email: values.email.trim(), role: values.role, isActive: values.isActive === 'true', ...(password ? { password } : {}) }
}