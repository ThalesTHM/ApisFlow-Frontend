import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatKilograms, formatStatus } from './format'

describe('format utilities', () => {
  it('formats backend date-only values without timezone drift', () => {
    expect(formatDate('2026-08-30')).toBe('30/08/2026')
  })

  it('formats decimal strings separately for kilograms and currency', () => {
    expect(formatKilograms('1234.50')).toContain('1.234,50 kg')
    expect(formatCurrency('1234.50')).toContain('1.234,50')
  })

  it('translates domain statuses consistently', () => {
    expect(formatStatus('AVAILABLE')).toBe('Disponível')
    expect(formatStatus('MANAGER')).toBe('Gestor')
  })
})