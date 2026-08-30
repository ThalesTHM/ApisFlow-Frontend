import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_KEY, apiRequest, setUnauthorizedHandler } from './client'

afterEach(() => {
  vi.restoreAllMocks()
  setUnauthorizedHandler(undefined)
})

describe('apiRequest', () => {
  it('sends the persisted access token and supports array error messages', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: 'signed-token' }))
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: ['Name is required', 'Email is invalid'], path: '/users', timestamp: new Date().toISOString() }), { status: 400, headers: { 'Content-Type': 'application/json' } }))

    await expect(apiRequest('/users')).rejects.toMatchObject({ status: 400, message: 'Name is required Email is invalid' })
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/users', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer signed-token' }) }))
  })

  it('notifies the session layer on unauthorized responses', async () => {
    const unauthorized = vi.fn()
    setUnauthorizedHandler(unauthorized)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } }))

    await expect(apiRequest('/users')).rejects.toMatchObject({ status: 401 })
    expect(unauthorized).toHaveBeenCalledOnce()
  })

  it('normalizes network failures without exposing browser internals', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(apiRequest('/orders')).rejects.toMatchObject({
      status: 0,
      message: 'Não foi possível concluir a operação.',
    })
  })
})