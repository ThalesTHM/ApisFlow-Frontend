import { api } from './client'
import type { CreateUserRequest, UpdateUserRequest, User } from './types'

export const userKeys = {
  all: ['users'] as const,
  detail: (id: string) => ['users', id] as const,
}

export const usersApi = {
  list: () => api.get<User[]>('/users'),
  get: (id: string) => api.get<User>(`/users/${id}`),
  create: (values: CreateUserRequest) => api.post<User>('/users', values),
  update: (id: string, values: UpdateUserRequest) => api.patch<User>(`/users/${id}`, values),
  delete: (id: string) => api.delete<{ deleted: true }>(`/users/${id}`),
}