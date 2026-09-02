import Decimal from 'decimal.js'
import { z } from 'zod'
import type { HoneyBatch, HoneyBatchRequest } from '../../api/types'

const decimalQuantity = z.string().trim().min(1, 'Informe a quantidade total.').refine((value) => {
  try { return new Decimal(value).greaterThan(0) && /^\d+(\.\d{1,2})?$/.test(value) } catch { return false }
}, 'Informe uma quantidade positiva com até duas casas decimais.')

export const honeyBatchSchema = z.object({
  productionCycleId: z.string().uuid('Selecione um ciclo de produção.'),
  code: z.string().trim().min(1, 'Informe o código.').max(80, 'Use no máximo 80 caracteres.'),
  productionDate: z.iso.date('Informe uma data válida.'),
  quantityKg: decimalQuantity,
  quality: z.enum(['STANDARD', 'PREMIUM']),
  status: z.enum(['AVAILABLE', 'DEPLETED', 'BLOCKED']),
})

export type HoneyBatchFormValues = z.infer<typeof honeyBatchSchema>

export function validateHoneyBatch(values: HoneyBatchFormValues, batch?: HoneyBatch): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!batch && values.status === 'DEPLETED') errors.status = 'Um lote novo não pode iniciar esgotado.'
  if (batch) {
    const soldQuantity = new Decimal(batch.quantityKg).minus(batch.availableQuantityKg)
    if (new Decimal(values.quantityKg).lessThan(soldQuantity)) errors.quantityKg = `A quantidade não pode ser menor que ${soldQuantity.toFixed(2)} kg já vendidos.`
  }
  return errors
}

export function toHoneyBatchRequest(values: HoneyBatchFormValues): HoneyBatchRequest {
  return {
    productionCycleId: values.productionCycleId,
    code: values.code.trim(),
    productionDate: values.productionDate,
    quantityKg: new Decimal(values.quantityKg).toNumber(),
    quality: values.quality,
    status: values.status,
  }
}