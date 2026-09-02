import Decimal from 'decimal.js'
import { z } from 'zod'
import type { CreateOrderRequest, OrderStatus } from '../../api/types'

const positiveDecimal = (label: string) => z.string().trim().min(1, `Informe ${label}.`).refine((value) => {
  try { return new Decimal(value).greaterThan(0) && /^\d+(\.\d{1,2})?$/.test(value) } catch { return false }
}, `Informe ${label} com até duas casas decimais.`)

const orderItemSchema = z.object({
  honeyBatchId: z.string().uuid('Selecione um lote de mel.'),
  quantityKg: positiveDecimal('uma quantidade positiva'),
  unitPrice: positiveDecimal('um preço unitário positivo'),
})

export const orderSchema = z.object({
  customerName: z.string().trim().min(2, 'Informe o nome do cliente.').max(120, 'Use no máximo 120 caracteres.'),
  customerDocument: z.string().trim().min(3, 'Informe o documento do cliente.').max(30, 'Use no máximo 30 caracteres.'),
  items: z.array(orderItemSchema).min(1, 'Adicione pelo menos um item.'),
}).superRefine((values, context) => {
  const seen = new Set<string>()
  values.items.forEach((item, index) => {
    if (seen.has(item.honeyBatchId)) context.addIssue({ code: 'custom', path: ['items', index, 'honeyBatchId'], message: 'Este lote já foi adicionado ao pedido.' })
    seen.add(item.honeyBatchId)
  })
})

export type OrderFormValues = z.infer<typeof orderSchema>

export function calculateOrderTotal(items: OrderFormValues['items']): Decimal {
  return items.reduce((total, item) => {
    try { return total.plus(new Decimal(item.quantityKg || 0).times(item.unitPrice || 0)) } catch { return total }
  }, new Decimal(0))
}

export function toCreateOrderRequest(values: OrderFormValues): CreateOrderRequest {
  return {
    customerName: values.customerName.trim(),
    customerDocument: values.customerDocument.trim(),
    items: values.items.map((item) => ({ honeyBatchId: item.honeyBatchId, quantityKg: new Decimal(item.quantityKg).toNumber(), unitPrice: new Decimal(item.unitPrice).toNumber() })),
  }
}

export function allowedOrderTransitions(status: OrderStatus): OrderStatus[] {
  return status === 'PENDING' ? ['CONFIRMED', 'CANCELLED'] : []
}