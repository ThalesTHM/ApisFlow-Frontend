import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { SESSION_KEY } from '../../api/client'
import type { Apiary, AuthResponse, Hive, UserRole } from '../../api/types'
import { AuthProvider } from '../../auth/AuthContext'

const apiary: Apiary = { id: '3e7ad94e-ea9c-4af0-892a-e34700996d8f', tenantId: 'tenant-1', name: 'Apiário Norte', location: 'Campo Norte', latitude: null, longitude: null, description: null, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' }
const hive: Hive = { id: '67c4e50e-ae02-45f4-9dd3-e266375b3799', tenantId: 'tenant-1', apiaryId: apiary.id, code: 'HIVE-001', queenStatus: 'PRESENT', colonyStatus: 'STRONG', installationDate: '2026-08-30T00:00:00.000Z', notes: 'Colmeia produtiva', createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' }

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }

function renderApp(path: string, role: UserRole, fetcher: (url: string, init?: RequestInit) => Promise<Response>) {
  const session: AuthResponse = { accessToken: 'token', tenant: { id: 'tenant-1', name: 'Cooperativa Norte', slug: 'norte' }, user: { id: 'user-1', tenantId: 'tenant-1', name: `${role} User`, email: `${role.toLowerCase()}@example.com`, role, isActive: true, createdAt: hive.createdAt, updatedAt: hive.updatedAt } }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (url.endsWith('/auth/me')) return Promise.resolve(json(session.user))
    return fetcher(url, init)
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const result = render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter></QueryClientProvider>)
  return { ...result, fetchMock }
}

afterEach(() => vi.restoreAllMocks())

describe('Hive management', () => {
  it('renders status badges and sends only supported backend filters', async () => {
    const user = userEvent.setup()
    const { fetchMock } = renderApp('/hives', 'ADMIN', async (url) => {
      if (url.endsWith('/apiaries')) return json([apiary])
      if (url.includes('/hives')) return json([hive])
      throw new Error(`Unexpected GET ${url}`)
    })
    expect(await screen.findByRole('cell', { name: hive.code })).toBeVisible()
    expect(screen.getByText('Presente')).toHaveClass('badge--present')
    expect(screen.getByText('Forte', { selector: '.badge' })).toHaveClass('badge--strong')

    await user.selectOptions(screen.getByLabelText('Apiário'), apiary.id)
    await user.selectOptions(screen.getByLabelText('Situação da colônia'), 'STRONG')
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith(`/hives?apiaryId=${apiary.id}&status=STRONG`))).toBe(true))
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('search='))).toBe(false)
  })

  it('creates a hive with Apiary selection and never sends tenantId', async () => {
    const user = userEvent.setup()
    let requestBody: Record<string, unknown> | undefined
    renderApp('/hives/new', 'ADMIN', async (url, init) => {
      if (url.endsWith('/apiaries')) return json([apiary])
      if (url.endsWith('/hives') && init?.method === 'POST') { requestBody = JSON.parse(String(init.body)) as Record<string, unknown>; return json(hive, 201) }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await user.selectOptions(await screen.findByLabelText('Apiário'), apiary.id)
    await user.type(screen.getByLabelText('Código'), hive.code)
    await user.type(screen.getByLabelText('Data de instalação'), '2026-08-30')
    await user.type(screen.getByLabelText('Observações'), hive.notes!)
    await user.click(screen.getByRole('button', { name: 'Salvar colmeia' }))
    expect(await screen.findByRole('heading', { name: hive.code })).toBeVisible()
    expect(requestBody).toEqual({ apiaryId: apiary.id, code: hive.code, queenStatus: 'UNKNOWN', colonyStatus: 'MODERATE', installationDate: '2026-08-30', notes: hive.notes })
    expect(requestBody).not.toHaveProperty('tenantId')
    expect(await screen.findByText('Colmeia criada com sucesso.')).toBeVisible()
  })

  it('updates a hive and preserves the returned detail cache', async () => {
    const user = userEvent.setup()
    let patchBody: unknown
    renderApp(`/hives/${hive.id}/edit`, 'MANAGER', async (url, init) => {
      if (url.endsWith('/apiaries')) return json([apiary])
      if (url.endsWith(`/hives/${hive.id}`) && !init?.method) return json(hive)
      if (url.endsWith(`/hives/${hive.id}`) && init?.method === 'PATCH') { patchBody = JSON.parse(String(init.body)); return json({ ...hive, code: 'HIVE-002', colonyStatus: 'MODERATE' }) }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    expect(await screen.findByDisplayValue(hive.code)).toBeVisible()
    await user.clear(screen.getByLabelText('Código'))
    await user.type(screen.getByLabelText('Código'), 'HIVE-002')
    await user.selectOptions(screen.getByLabelText('Situação da colônia'), 'MODERATE')
    await user.click(screen.getByRole('button', { name: 'Salvar colmeia' }))
    expect(await screen.findByRole('heading', { name: 'HIVE-002' })).toBeVisible()
    expect(patchBody).toMatchObject({ apiaryId: apiary.id, code: 'HIVE-002', colonyStatus: 'MODERATE' })
    expect(await screen.findByText('Colmeia atualizada com sucesso.')).toBeVisible()
  })

  it('surfaces tenant-wide duplicate code conflicts', async () => {
    const user = userEvent.setup()
    renderApp('/hives/new', 'ADMIN', async (url) => {
      if (url.endsWith('/apiaries')) return json([apiary])
      return json({ statusCode: 409, error: 'Conflict', message: 'Hive code is already in use in this tenant', path: '/hives', timestamp: new Date().toISOString() }, 409)
    })
    await user.selectOptions(await screen.findByLabelText('Apiário'), apiary.id)
    await user.type(screen.getByLabelText('Código'), hive.code)
    await user.type(screen.getByLabelText('Data de instalação'), '2026-08-30')
    await user.click(screen.getByRole('button', { name: 'Salvar colmeia' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Hive code is already in use in this tenant')
  })

  it('deletes only after confirmation and refreshes the filtered lists', async () => {
    const user = userEvent.setup()
    let deleted = false
    renderApp('/hives', 'ADMIN', async (url, init) => {
      if (url.endsWith('/apiaries')) return json([apiary])
      if (url.endsWith(`/hives/${hive.id}`) && init?.method === 'DELETE') { deleted = true; return json({ deleted: true }) }
      if (url.endsWith('/hives')) return json(deleted ? [] : [hive])
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await user.click(await screen.findByRole('button', { name: `Excluir ${hive.code}` }))
    expect(screen.getByRole('dialog', { name: 'Excluir colmeia' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Nenhuma colmeia encontrada')).toBeVisible()
    expect(await screen.findByText('Colmeia excluída com sucesso.')).toBeVisible()
  })

  it('allows operator reads while hiding and denying destructive routes', async () => {
    const { unmount } = renderApp('/hives', 'OPERATOR', async (url) => url.endsWith('/apiaries') ? json([apiary]) : json([hive]))
    expect(await screen.findByRole('cell', { name: hive.code })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Nova colmeia' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: `Editar ${hive.code}` })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: `Excluir ${hive.code}` })).not.toBeInTheDocument()
    unmount()

    renderApp('/hives/new', 'OPERATOR', async () => json([]))
    expect(await screen.findByRole('heading', { name: 'Permissão insuficiente' })).toBeVisible()
  })
})