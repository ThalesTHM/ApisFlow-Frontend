import { api } from './client'
import type { CreateOrderRequest, Order, OrderStatus } from './types'

export const orderKeys = {
  all: ['orders'] as const,
  lists: ['orders', 'list'] as const,
  list: () => ['orders', 'list'] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
}

export const ordersApi = {
  list: () => api.get<Order[]>('/orders'),
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  create: (values: CreateOrderRequest) => api.post<Order>('/orders', values),
  updateStatus: (id: string, status: OrderStatus) => api.patch<Order>(`/orders/${id}/status`, { status }),
}