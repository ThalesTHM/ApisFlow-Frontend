import { api } from './client'
import type { HoneyBatch, HoneyBatchRequest } from './types'

export const honeyBatchKeys = {
  all: ['honey-batches'] as const,
  lists: ['honey-batches', 'list'] as const,
  list: () => ['honey-batches', 'list'] as const,
  detail: (id: string) => ['honey-batches', 'detail', id] as const,
}

export const honeyBatchesApi = {
  list: () => api.get<HoneyBatch[]>('/honey-batches'),
  get: (id: string) => api.get<HoneyBatch>(`/honey-batches/${id}`),
  create: (values: HoneyBatchRequest) => api.post<HoneyBatch>('/honey-batches', values),
  update: (id: string, values: HoneyBatchRequest) => api.patch<HoneyBatch>(`/honey-batches/${id}`, values),
  delete: (id: string) => api.delete<{ deleted: true }>(`/honey-batches/${id}`),
}