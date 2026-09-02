import { describe, expect, it } from 'vitest'
import type { HoneyBatch } from '../../api/types'
import { honeyBatchSchema, toHoneyBatchRequest, validateHoneyBatch } from './honey-batch-schema'

const values = { productionCycleId: '74ed7043-1d1f-47f0-a428-cf1eb26a82e4', code: 'LOTE-001', productionDate: '2026-09-02', quantityKg: '100.50', quality: 'PREMIUM' as const, status: 'AVAILABLE' as const }
const batch: HoneyBatch = { id: '44e584fc-05e7-4fd9-a0a4-912506ace129', tenantId: 'tenant-1', ...values, quantityKg: '100.50', availableQuantityKg: '65.25' }

describe('Honey Batch validation', () => {
  it('accepts decimal-safe quantities and converts only at the API boundary', () => {
    expect(honeyBatchSchema.safeParse(values).success).toBe(true)
    expect(toHoneyBatchRequest(values)).toEqual({ ...values, quantityKg: 100.5 })
  })

  it('rejects invalid precision and non-positive quantities', () => {
    expect(honeyBatchSchema.safeParse({ ...values, quantityKg: '1.234' }).success).toBe(false)
    expect(honeyBatchSchema.safeParse({ ...values, quantityKg: '0' }).success).toBe(false)
  })

  it('prevents new batches from starting depleted', () => {
    expect(validateHoneyBatch({ ...values, status: 'DEPLETED' })).toEqual({ status: 'Um lote novo não pode iniciar esgotado.' })
  })

  it('does not allow total quantity below stock already sold', () => {
    expect(validateHoneyBatch({ ...values, quantityKg: '35.24' }, batch).quantityKg).toContain('35.25 kg já vendidos')
    expect(validateHoneyBatch({ ...values, quantityKg: '35.25' }, batch)).toEqual({})
  })
})