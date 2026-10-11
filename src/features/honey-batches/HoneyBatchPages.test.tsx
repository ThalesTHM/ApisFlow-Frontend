import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { SESSION_KEY } from '../../api/client'
import type { AuthResponse, HoneyBatch, ProductionCycle, UserRole } from '../../api/types'
import { AuthProvider } from '../../auth/AuthContext'

const cycle: ProductionCycle = { id: '74ed7043-1d1f-47f0-a428-cf1eb26a82e4', tenantId: 'tenant-1', hiveId: '67c4e50e-ae02-45f4-9dd3-e266375b3799', startDate: '2026-09-01T00:00:00.000Z', endDate: null, status: 'ACTIVE', estimatedProductionKg: '100.50', actualProductionKg: null, notes: null }
const batch: HoneyBatch = { id: '44e584fc-05e7-4fd9-a0a4-912506ace129', tenantId: 'tenant-1', productionCycleId: cycle.id, code: 'LOTE-001', productionDate: '2026-09-02T00:00:00.000Z', quantityKg: '100.50', availableQuantityKg: '65.25', quality: 'PREMIUM', status: 'AVAILABLE' }

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }

function renderApp(path: string, role: UserRole, fetcher: (url: string, init?: RequestInit) => Promise<Response>) {
  const session: AuthResponse = { accessToken: 'token', tenant: { id: 'tenant-1', name: 'Cooperativa Norte', slug: 'norte' }, user: { id: 'user-1', tenantId: 'tenant-1', name: `${role} User`, email: `${role.toLowerCase()}@example.com`, role, isActive: true, createdAt: cycle.startDate, updatedAt: cycle.startDate } }
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

describe('Honey Batch management', () => {
  it('shows total and available stock with quality and status badges', async () => {
    renderApp('/honey-batches', 'ADMIN', async (url) => {
      if (url.endsWith('/production-cycles')) return json([cycle])
      if (url.endsWith('/honey-batches')) return json([batch])
      throw new Error(`Unexpected GET ${url}`)
    })
    const row = (await screen.findByRole('link', { name: batch.code })).closest('tr')!
    expect(within(row).getByText('65,25 kg')).toBeVisible()
    expect(within(row).getByText(/de 100,50 kg/)).toBeVisible()
    expect(within(row).getByText('Premium')).toHaveClass('badge--premium')
    expect(within(row).getByText('Disponível')).toHaveClass('badge--available')
    expect(within(row).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '65')
  })

  it('creates a batch with cycle selection and a decimal-safe tenant-free payload', async () => {
    const user = userEvent.setup()
    let requestBody: Record<string, unknown> | undefined
    renderApp('/honey-batches/new', 'ADMIN', async (url, init) => {
      if (url.endsWith('/production-cycles')) return json([cycle])
      if (url.endsWith('/honey-batches') && init?.method === 'POST') { requestBody = JSON.parse(String(init.body)); return json({ ...batch, quantityKg: '100.50', availableQuantityKg: '100.50' }, 201) }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await user.selectOptions(await screen.findByLabelText('Ciclo de produção'), cycle.id)
    expect(within(screen.getByLabelText('Situação')).queryByRole('option', { name: 'Esgotado' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Código'), batch.code)
    await user.type(screen.getByLabelText('Data de produção'), '2026-09-02')
    await user.type(screen.getByLabelText('Quantidade total (kg)'), '100.50')
    await user.selectOptions(screen.getByLabelText('Qualidade'), 'PREMIUM')
    await user.click(screen.getByRole('button', { name: 'Salvar lote' }))
    expect(await screen.findByRole('heading', { name: batch.code })).toBeVisible()
    expect(requestBody).toEqual({ productionCycleId: cycle.id, code: batch.code, productionDate: '2026-09-02', quantityKg: 100.5, quality: 'PREMIUM', status: 'AVAILABLE' })
    expect(requestBody).not.toHaveProperty('tenantId')
    expect(requestBody).not.toHaveProperty('availableQuantityKg')
  })

  it('prevents reducing total quantity below stock already sold', async () => {
    const user = userEvent.setup()
    const { fetchMock } = renderApp(`/honey-batches/${batch.id}/edit`, 'MANAGER', async (url) => {
      if (url.endsWith('/production-cycles')) return json([cycle])
      if (url.endsWith(`/honey-batches/${batch.id}`)) return json(batch)
      throw new Error(`Unexpected GET ${url}`)
    })
    const quantity = await screen.findByLabelText('Quantidade total (kg)')
    await user.clear(quantity)
    await user.type(quantity, '35.24')
    await user.click(screen.getByRole('button', { name: 'Salvar lote' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('35.25 kg já vendidos')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
    expect(screen.getByText('65,25 kg disponíveis')).toBeVisible()
  })

  it('presents backend 409 code conflicts visibly', async () => {
    const user = userEvent.setup()
    renderApp('/honey-batches/new', 'ADMIN', async (url) => {
      if (url.endsWith('/production-cycles')) return json([cycle])
      return json({ statusCode: 409, error: 'Conflict', message: 'Batch code already exists for this tenant', path: '/honey-batches', timestamp: new Date().toISOString() }, 409)
    })
    await user.selectOptions(await screen.findByLabelText('Ciclo de produção'), cycle.id)
    await user.type(screen.getByLabelText('Código'), batch.code)
    await user.type(screen.getByLabelText('Data de produção'), '2026-09-02')
    await user.type(screen.getByLabelText('Quantidade total (kg)'), '100.50')
    await user.click(screen.getByRole('button', { name: 'Salvar lote' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir porque os dados entram em conflito com o estado atual.')
    expect(screen.queryByText('Batch code already exists for this tenant')).not.toBeInTheDocument()
  })

  it('deletes after confirmation and prevents operator writes', async () => {
    const user = userEvent.setup()
    let deleted = false
    const { unmount } = renderApp('/honey-batches', 'ADMIN', async (url, init) => {
      if (url.endsWith('/production-cycles')) return json([cycle])
      if (url.endsWith(`/honey-batches/${batch.id}`) && init?.method === 'DELETE') { deleted = true; return json({ deleted: true }) }
      if (url.endsWith('/honey-batches')) return json(deleted ? [] : [batch])
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await user.click(await screen.findByRole('button', { name: `Excluir lote ${batch.code}` }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Nenhum lote cadastrado')).toBeVisible()
    unmount()
    renderApp('/honey-batches/new', 'OPERATOR', async () => json([]))
    expect(await screen.findByRole('heading', { name: 'Permissão insuficiente' })).toBeVisible()
  })
})