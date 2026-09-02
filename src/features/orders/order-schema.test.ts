import { describe, expect, it } from 'vitest'
import { allowedOrderTransitions, calculateOrderTotal, orderSchema, toCreateOrderRequest } from './order-schema'

const values = { customerName: 'Mercado Central', customerDocument: '12.345.678/0001-90', items: [{ honeyBatchId: '44e584fc-05e7-4fd9-a0a4-912506ace129', quantityKg: '2.35', unitPrice: '19.90' }] }

describe('Order validation', () => {
  it('calculates totals with Decimal and converts only at the API boundary', () => {
    expect(calculateOrderTotal(values.items).toFixed(2)).toBe('46.77')
    expect(toCreateOrderRequest(values)).toEqual({ ...values, items: [{ ...values.items[0], quantityKg: 2.35, unitPrice: 19.9 }] })
  })

  it('rejects the same batch twice', () => {
    const result = orderSchema.safeParse({ ...values, items: [values.items[0], values.items[0]] })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]).toMatchObject({ path: ['items', 1, 'honeyBatchId'], message: 'Este lote já foi adicionado ao pedido.' })
  })

  it('rejects invalid quantity and money precision', () => {
    expect(orderSchema.safeParse({ ...values, items: [{ ...values.items[0], quantityKg: '0' }] }).success).toBe(false)
    expect(orderSchema.safeParse({ ...values, items: [{ ...values.items[0], unitPrice: '1.999' }] }).success).toBe(false)
  })

  it('allows transitions only while an order is pending', () => {
    expect(allowedOrderTransitions('PENDING')).toEqual(['CONFIRMED', 'CANCELLED'])
    expect(allowedOrderTransitions('CONFIRMED')).toEqual([])
    expect(allowedOrderTransitions('CANCELLED')).toEqual([])
  })
})