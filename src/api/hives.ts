import { api } from './client'
import type { ColonyStatus, Hive, HiveRequest } from './types'

export interface HiveFilters { apiaryId?: string; status?: ColonyStatus }

export const hiveKeys = {
  all: ['hives'] as const,
  lists: ['hives', 'list'] as const,
  list: (filters: HiveFilters) => ['hives', 'list', filters] as const,
  detail: (id: string) => ['hives', 'detail', id] as const,
}

export const hivesApi = {
  list: (filters: HiveFilters = {}) => {
    const query = new URLSearchParams()
    if (filters.apiaryId) query.set('apiaryId', filters.apiaryId)
    if (filters.status) query.set('status', filters.status)
    const suffix = query.size ? `?${query.toString()}` : ''
    return api.get<Hive[]>(`/hives${suffix}`)
  },
  get: (id: string) => api.get<Hive>(`/hives/${id}`),
  create: (values: HiveRequest) => api.post<Hive>('/hives', values),
  update: (id: string, values: HiveRequest) => api.patch<Hive>(`/hives/${id}`, values),
  delete: (id: string) => api.delete<{ deleted: true }>(`/hives/${id}`),
}