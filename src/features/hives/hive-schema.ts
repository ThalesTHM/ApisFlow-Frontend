import { z } from 'zod'
import type { HiveRequest } from '../../api/types'
import { uuidSchema } from '../../validation/schemas'

export const hiveSchema = z.object({
  apiaryId: uuidSchema,
  code: z.string().trim().min(1, 'Campo obrigatório.').max(50, 'Use no máximo 50 caracteres.'),
  queenStatus: z.enum(['PRESENT', 'ABSENT', 'UNKNOWN']),
  colonyStatus: z.enum(['STRONG', 'MODERATE', 'WEAK', 'INACTIVE']),
  installationDate: z.iso.date('Informe uma data válida.'),
  notes: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.'),
})

export type HiveFormValues = z.infer<typeof hiveSchema>

export function toHiveRequest(values: HiveFormValues): HiveRequest {
  return {
    apiaryId: values.apiaryId,
    code: values.code,
    queenStatus: values.queenStatus,
    colonyStatus: values.colonyStatus,
    installationDate: values.installationDate,
    ...(values.notes ? { notes: values.notes } : {}),
  }
}