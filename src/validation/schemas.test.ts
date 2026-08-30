import { describe, expect, it } from 'vitest'
import { decimalInput, fieldErrors, tenantSlugSchema, uuidSchema } from './schemas'
import { z } from 'zod'

describe('validation conventions', () => {
  it('accepts canonical tenant slugs and UUIDs', () => {
    expect(tenantSlugSchema.parse('mel-do-norte')).toBe('mel-do-norte')
    expect(uuidSchema.safeParse('3e7ad94e-ea9c-4af0-892a-e34700996d8f').success).toBe(true)
  })

  it('normalizes numeric form input and maps field errors', () => {
    expect(decimalInput(0.01).parse('12.50')).toBe(12.5)
    const result = z.object({ quantity: decimalInput(0.01) }).safeParse({ quantity: '0' })
    expect(result.success).toBe(false)
    if (!result.success) expect(fieldErrors(result.error).quantity).toBeTruthy()
  })
})