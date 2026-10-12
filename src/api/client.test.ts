import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_KEY, apiRequest, setUnauthorizedHandler } from './client'

afterEach(() => {
  vi.restoreAllMocks()
  setUnauthorizedHandler(undefined)
})

describe('apiRequest', () => {
  it('sends the persisted access token without exposing raw backend validation messages', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: 'signed-token' }))
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: ['Name is required', 'Email is invalid'], path: '/users', timestamp: new Date().toISOString() }), { status: 400, headers: { 'Content-Type': 'application/json' } }))

    await expect(apiRequest('/users')).rejects.toMatchObject({ status: 400, message: 'Não foi possível concluir. Revise os dados informados.', details: { message: ['Name is required', 'Email is invalid'] } })
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/users', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer signed-token' }) }))
  })

  it('notifies the session layer on unauthorized responses', async () => {
    const unauthorized = vi.fn()
    setUnauthorizedHandler(unauthorized)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } }))

    await expect(apiRequest('/users')).rejects.toMatchObject({ status: 401 })
    expect(unauthorized).toHaveBeenCalledOnce()
  })

  it.each([
    [403, 'Você não tem permissão para esta ação.'],
    [404, 'O registro solicitado não foi encontrado.'],
    [409, 'Não foi possível concluir porque os dados entram em conflito com o estado atual.'],
  ])('maps HTTP %s to safe primary copy', async (status, message) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ statusCode: status, message: 'Internal backend detail' }), { status, headers: { 'Content-Type': 'application/json' } }))
    await expect(apiRequest('/resource')).rejects.toMatchObject({ status, message })
  })

  it('normalizes network failures without exposing browser internals', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(apiRequest('/orders')).rejects.toMatchObject({
      status: 0,
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    })
  })
})