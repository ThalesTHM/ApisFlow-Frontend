import { api } from './client'
import type { Apiary, ApiaryRequest } from './types'

export const apiaryKeys = {
  all: ['apiaries'] as const,
  detail: (id: string) => ['apiaries', id] as const,
}

export const apiariesApi = {
  list: () => api.get<Apiary[]>('/apiaries'),
  get: (id: string) => api.get<Apiary>(`/apiaries/${id}`),
  create: (values: ApiaryRequest) => api.post<Apiary>('/apiaries', values),
  update: (id: string, values: ApiaryRequest) => api.patch<Apiary>(`/apiaries/${id}`, values),
  delete: (id: string) => api.delete<{ deleted: true }>(`/apiaries/${id}`),
}