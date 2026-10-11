import { api } from './client'
import type { ProductionCycle, ProductionCycleRequest, ProductionCycleStatus } from './types'

export interface ProductionCycleFilters { hiveId?: string; status?: ProductionCycleStatus }

export const productionCycleKeys = {
  all: ['production-cycles'] as const,
  lists: ['production-cycles', 'list'] as const,
  list: (filters: ProductionCycleFilters) => ['production-cycles', 'list', filters] as const,
  detail: (id: string) => ['production-cycles', 'detail', id] as const,
}

export const productionCyclesApi = {
  list: (filters: ProductionCycleFilters = {}) => {
    const query = new URLSearchParams()
    if (filters.hiveId) query.set('hiveId', filters.hiveId)
    if (filters.status) query.set('status', filters.status)
    return api.get<ProductionCycle[]>(`/production-cycles${query.size ? `?${query.toString()}` : ''}`)
  },
  get: (id: string) => api.get<ProductionCycle>(`/production-cycles/${id}`),
  create: (values: ProductionCycleRequest) => api.post<ProductionCycle>('/production-cycles', values),
  update: (id: string, values: ProductionCycleRequest) => api.patch<ProductionCycle>(`/production-cycles/${id}`, values),
  delete: (id: string) => api.delete<{ deleted: true }>(`/production-cycles/${id}`),
}