import { describe, expect, it } from 'vitest'
import { productionCycleSchema, toProductionCycleRequest } from './production-cycle-schema'

const base = { hiveId: '67c4e50e-ae02-45f4-9dd3-e266375b3799', startDate: '2026-09-01', endDate: '', status: 'PLANNED' as const, estimatedProductionKg: '', actualProductionKg: '', notes: '' }

describe('production cycle status validation', () => {
  it('requires end date and actual production when completed', () => {
    const result = productionCycleSchema.safeParse({ ...base, status: 'COMPLETED' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.flatten().fieldErrors).toMatchObject({ endDate: expect.any(Array), actualProductionKg: expect.any(Array) })
  })

  it('accepts zero actual production for a completed cycle', () => {
    expect(productionCycleSchema.safeParse({ ...base, status: 'COMPLETED', endDate: '2026-09-30', actualProductionKg: '0' }).success).toBe(true)
  })

  it('rejects an end date before the start date and excess decimal places', () => {
    const result = productionCycleSchema.safeParse({ ...base, endDate: '2026-08-31', estimatedProductionKg: '12.345' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.flatten().fieldErrors).toMatchObject({ endDate: expect.any(Array), estimatedProductionKg: expect.any(Array) })
  })

  it('converts decimal strings only at the API boundary', () => {
    expect(toProductionCycleRequest({ ...base, estimatedProductionKg: '1234.50', actualProductionKg: '22.75' })).toMatchObject({ estimatedProductionKg: 1234.5, actualProductionKg: 22.75 })
  })
})