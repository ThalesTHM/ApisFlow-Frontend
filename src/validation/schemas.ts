import { z, type ZodError } from 'zod'

export const validationMessages = {
  required: 'Campo obrigatório.',
  email: 'Informe um e-mail válido.',
  uuid: 'Selecione um registro válido.',
}

export const emailSchema = z.email(validationMessages.email).max(254)
export const uuidSchema = z.uuid(validationMessages.uuid)
export const passwordSchema = z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(72)
export const tenantSlugSchema = z.string().min(2, 'Use pelo menos 2 caracteres.').max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use letras minúsculas, números e hífens.')

export function optionalText(maxLength: number) {
  return z.string().max(maxLength).transform((value) => value.trim() || undefined).optional()
}

export function decimalInput(minimum = 0) {
  return z.preprocess((value) => value === '' ? undefined : Number(value), z.number().min(minimum))
}

export function fieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '_')
    if (!errors[field]) errors[field] = issue.message
  }
  return errors
}