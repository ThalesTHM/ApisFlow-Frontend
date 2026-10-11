import type { ApiErrorBody } from './types'

declare global {
  interface Window {
    __APP_CONFIG__?: { apiUrl?: string }
  }
}

// Ordem: configuração do container (config.js) > VITE_API_URL > padrão local
const API_URL =
  window.__APP_CONFIG__?.apiUrl ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'
const SESSION_KEY = 'honey-manager.session'

let onUnauthorized: (() => void) | undefined

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly details?: ApiErrorBody) {
    super(friendlyStatus(status))
    this.name = 'ApiError'
  }
}

function friendlyStatus(status: number) {
  const messages: Record<number, string> = {
    0: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    400: 'Não foi possível concluir. Revise os dados informados.',
    401: 'Sua sessão expirou. Entre novamente.',
    403: 'Você não tem permissão para esta ação.',
    404: 'O registro solicitado não foi encontrado.',
    409: 'Não foi possível concluir porque os dados entram em conflito com o estado atual.',
  }
  return messages[status] ?? 'Não foi possível concluir a operação.'
}

function token() {
  try {
    return (JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as { accessToken?: string } | null)?.accessToken
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return undefined
  }
}

export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  onUnauthorized = handler
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const accessToken = token()
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(0)
  }

  if (!response.ok) {
    let details: ApiErrorBody | undefined
    try { details = await response.json() as ApiErrorBody } catch { /* Empty or non-JSON error. */ }
    if (response.status === 401) onUnauthorized?.()
    throw new ApiError(response.status, details)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
}

export { SESSION_KEY }