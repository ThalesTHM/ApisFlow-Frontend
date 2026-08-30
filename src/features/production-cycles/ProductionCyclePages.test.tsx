import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { SESSION_KEY } from '../../api/client'
import type { AuthResponse, Hive, ProductionCycle, UserRole } from '../../api/types'
import { AuthProvider } from '../../auth/AuthContext'

const hive: Hive = { id: '67c4e50e-ae02-45f4-9dd3-e266375b3799', tenantId: 'tenant-1', apiaryId: '3e7ad94e-ea9c-4af0-892a-e34700996d8f', code: 'HIVE-001', queenStatus: 'PRESENT', colonyStatus: 'STRONG', installationDate: '2026-08-30T00:00:00.000Z', notes: null, createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' }
const cycle: ProductionCycle = { id: '74ed7043-1d1f-47f0-a428-cf1eb26a82e4', tenantId: 'tenant-1', hiveId: hive.id, startDate: '2026-09-01T00:00:00.000Z', endDate: null, status: 'ACTIVE', estimatedProductionKg: '1234.50', actualProductionKg: null, notes: 'Florada principal' }

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

describe('Production Cycle management', () => {
  it('shows status and decimal-safe quantities while using supported filters', async () => {
    const user = userEvent.setup()
    const { fetchMock } = renderApp('/production-cycles', 'ADMIN', async (url) => {
      if (url.endsWith('/hives')) return json([hive])
      if (url.includes('/production-cycles')) return json([cycle])
      throw new Error(`Unexpected GET ${url}`)
    })
    expect(await screen.findByRole('cell', { name: '1.234,50 kg' })).toBeVisible()
    expect(screen.getByText('Ativo', { selector: '.badge' })).toHaveClass('badge--active')
    await user.selectOptions(screen.getByLabelText('Colmeia'), hive.id)
    await user.selectOptions(screen.getByLabelText('Situação'), 'ACTIVE')
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith(`/production-cycles?hiveId=${hive.id}&status=ACTIVE`))).toBe(true))
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('search='))).toBe(false)
  })

  it('creates a cycle with Hive selection and decimal-safe payload values', async () => {
    const user = userEvent.setup()
    let requestBody: Record<string, unknown> | undefined
    renderApp('/production-cycles/new', 'ADMIN', async (url, init) => {
      if (url.endsWith('/hives')) return json([hive])
      if (url.endsWith('/production-cycles') && init?.method === 'POST') { requestBody = JSON.parse(String(init.body)) as Record<string, unknown>; return json(cycle, 201) }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await user.selectOptions(await screen.findByLabelText('Colmeia'), hive.id)
    await user.type(screen.getByLabelText('Data inicial'), '2026-09-01')
    await user.type(screen.getByLabelText('Produção estimada (kg)'), '1234.50')
    await user.type(screen.getByLabelText('Observações'), cycle.notes!)
    await user.click(screen.getByRole('button', { name: 'Salvar ciclo' }))
    expect(await screen.findByRole('heading', { name: `Ciclo de ${hive.code}` })).toBeVisible()
    expect(requestBody).toEqual({ hiveId: hive.id, startDate: '2026-09-01', status: 'PLANNED', estimatedProductionKg: 1234.5, notes: cycle.notes })
    expect(requestBody).not.toHaveProperty('tenantId')
    expect(await screen.findByText('Ciclo criado com sucesso.')).toBeVisible()
  })

  it('updates a completed cycle and keeps the returned detail cached', async () => {
    const user = userEvent.setup()
    let patchBody: unknown
    renderApp(`/production-cycles/${cycle.id}/edit`, 'MANAGER', async (url, init) => {
      if (url.endsWith('/hives')) return json([hive])
      if (url.endsWith(`/production-cycles/${cycle.id}`) && !init?.method) return json(cycle)
      if (url.endsWith(`/production-cycles/${cycle.id}`) && init?.method === 'PATCH') { patchBody = JSON.parse(String(init.body)); return json({ ...cycle, status: 'COMPLETED', endDate: '2026-09-30T00:00:00.000Z', actualProductionKg: '1200.25' }) }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    expect(await screen.findByLabelText('Situação')).toHaveValue('ACTIVE')
    await user.selectOptions(screen.getByLabelText('Situação'), 'COMPLETED')
    await user.type(screen.getByLabelText('Data final'), '2026-09-30')
    await user.type(screen.getByLabelText('Produção real (kg)'), '1200.25')
    await user.click(screen.getByRole('button', { name: 'Salvar ciclo' }))
    expect(await screen.findByText('1.200,25 kg')).toBeVisible()
    expect(patchBody).toMatchObject({ status: 'COMPLETED', endDate: '2026-09-30', actualProductionKg: 1200.25 })
    expect(await screen.findByText('Ciclo atualizado com sucesso.')).toBeVisible()
  })

  it.each([
    [409, 'Hive already has an active production cycle'],
    [400, 'Completed cycles require an end date and actual production'],
  ])('presents backend %s business-rule responses', async (status, message) => {
    const user = userEvent.setup()
    renderApp('/production-cycles/new', 'ADMIN', async (url) => url.endsWith('/hives') ? json([hive]) : json({ statusCode: status, error: 'Request Error', message, path: '/production-cycles', timestamp: new Date().toISOString() }, status))
    await user.selectOptions(await screen.findByLabelText('Colmeia'), hive.id)
    await user.type(screen.getByLabelText('Data inicial'), '2026-09-01')
    await user.selectOptions(screen.getByLabelText('Situação'), status === 409 ? 'ACTIVE' : 'PLANNED')
    await user.click(screen.getByRole('button', { name: 'Salvar ciclo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('deletes after confirmation and prevents operator writes', async () => {
    const user = userEvent.setup()
    let deleted = false
    const { unmount } = renderApp('/production-cycles', 'ADMIN', async (url, init) => {
      if (url.endsWith('/hives')) return json([hive])
      if (url.endsWith(`/production-cycles/${cycle.id}`) && init?.method === 'DELETE') { deleted = true; return json({ deleted: true }) }
      if (url.endsWith('/production-cycles')) return json(deleted ? [] : [cycle])
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await user.click(await screen.findByRole('button', { name: `Excluir ciclo de ${hive.code}` }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Nenhum ciclo encontrado')).toBeVisible()
    unmount()

    renderApp('/production-cycles/new', 'OPERATOR', async () => json([]))
    expect(await screen.findByRole('heading', { name: 'Permissão insuficiente' })).toBeVisible()
  })
})