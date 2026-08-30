import { z } from 'zod'
import type { ApiaryRequest } from '../../api/types'

const coordinate = (minimum: number, maximum: number, label: string) => z.string().trim().refine(
  (value) => value === '' || (/^-?\d+(?:\.\d{1,6})?$/.test(value) && Number(value) >= minimum && Number(value) <= maximum),
  `${label} deve estar entre ${minimum} e ${maximum}, com até 6 casas decimais.`,
)

export const apiarySchema = z.object({
  name: z.string().trim().min(2, 'Use pelo menos 2 caracteres.').max(100, 'Use no máximo 100 caracteres.'),
  location: z.string().trim().min(2, 'Use pelo menos 2 caracteres.').max(200, 'Use no máximo 200 caracteres.'),
  latitude: coordinate(-90, 90, 'Latitude'),
  longitude: coordinate(-180, 180, 'Longitude'),
  description: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.'),
}).superRefine((values, context) => {
  if ((values.latitude === '') !== (values.longitude === '')) {
    const field = values.latitude === '' ? 'latitude' : 'longitude'
    context.addIssue({ code: 'custom', path: [field], message: 'Informe latitude e longitude juntas.' })
  }
})

export type ApiaryFormValues = z.infer<typeof apiarySchema>

export function toApiaryRequest(values: ApiaryFormValues): ApiaryRequest {
  return {
    name: values.name,
    location: values.location,
    ...(values.latitude && values.longitude ? { latitude: Number(values.latitude), longitude: Number(values.longitude) } : {}),
    ...(values.description ? { description: values.description } : {}),
  }
}