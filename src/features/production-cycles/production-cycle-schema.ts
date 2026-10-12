import Decimal from 'decimal.js'
import { z } from 'zod'
import type { ProductionCycleRequest } from '../../api/types'
import { uuidSchema } from '../../validation/schemas'

const quantity = z.string().trim().refine((value) => value === '' || /^\d+(?:\.\d{1,2})?$/.test(value), 'Use um valor não negativo com até 2 casas decimais.')

export const productionCycleSchema = z.object({
  hiveId: uuidSchema,
  startDate: z.iso.date('Informe uma data válida.'),
  endDate: z.union([z.literal(''), z.iso.date('Informe uma data válida.')]),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
  estimatedProductionKg: quantity,
  actualProductionKg: quantity,
  notes: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.'),
}).superRefine((values, context) => {
  if (values.endDate && values.endDate < values.startDate) context.addIssue({ code: 'custom', path: ['endDate'], message: 'A data final não pode ser anterior à inicial.' })
  if (values.status === 'COMPLETED' && !values.endDate) context.addIssue({ code: 'custom', path: ['endDate'], message: 'Informe a data final para concluir o ciclo.' })
  if (values.status === 'COMPLETED' && values.actualProductionKg === '') context.addIssue({ code: 'custom', path: ['actualProductionKg'], message: 'Informe a produção real para concluir o ciclo.' })
})

export type ProductionCycleFormValues = z.infer<typeof productionCycleSchema>

export function toProductionCycleRequest(values: ProductionCycleFormValues): ProductionCycleRequest {
  return {
    hiveId: values.hiveId,
    startDate: values.startDate,
    status: values.status,
    ...(values.endDate ? { endDate: values.endDate } : {}),
    ...(values.estimatedProductionKg ? { estimatedProductionKg: new Decimal(values.estimatedProductionKg).toNumber() } : {}),
    ...(values.actualProductionKg ? { actualProductionKg: new Decimal(values.actualProductionKg).toNumber() } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
  }
}