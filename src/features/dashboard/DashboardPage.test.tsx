import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { SESSION_KEY } from '../../api/client'
import type { AuthResponse, UserRole } from '../../api/types'
import { AuthProvider } from '../../auth/AuthContext'

const apiaries = [{ id: 'a1' }, { id: 'a2' }]
const hives = [{ id: 'h1', colonyStatus: 'STRONG' }, { id: 'h2', colonyStatus: 'WEAK' }]
const cycles = [{ id: 'c1', status: 'ACTIVE' }, { id: 'c2', status: 'COMPLETED' }]
const batches = [{ id: 'b1', availableQuantityKg: '10.10', quality: 'PREMIUM', status: 'AVAILABLE' }, { id: 'b2', availableQuantityKg: '2.20', quality: 'STANDARD', status: 'BLOCKED' }]
const orders = [{ id: 'o1', customerName: 'Cliente antigo', customerPhone: null, status: 'PENDING', total: '10.00', createdAt: '2026-09-01T00:00:00Z' }, { id: 'o2', customerName: 'Cliente recente', customerPhone: '+55 11 91234-5678', status: 'CONFIRMED', total: '20.00', createdAt: '2026-09-02T00:00:00Z' }]

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }

function renderDashboard(role: UserRole, options: { failPath?: string; resources?: Record<string, unknown>; pending?: boolean } = {}) {
  const session: AuthResponse = { accessToken: 'token', tenant: { id: 'tenant-1', name: 'Cooperativa Norte', slug: 'norte' }, user: { id: 'user-1', tenantId: 'tenant-1', name: `${role} User`, email: `${role.toLowerCase()}@example.com`, role, isActive: true, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' } }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  const resources: Record<string, unknown> = { '/apiaries': apiaries, '/hives': hives, '/production-cycles': cycles, '/honey-batches': batches, '/orders': orders, ...options.resources }
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (url.endsWith('/auth/me')) return Promise.resolve(json(session.user))
    const path = Object.keys(resources).find((candidate) => url.endsWith(candidate))
    if (!path) throw new Error(`Unsupported dashboard request ${url}`)
    if (options.pending) return new Promise<Response>(() => undefined)
    if (path === options.failPath) return Promise.resolve(json({ statusCode: 500, message: 'Unavailable' }, 500))
    return Promise.resolve(json(resources[path]))
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/']}><AuthProvider><App /></AuthProvider></MemoryRouter></QueryClientProvider>)
  return fetchMock
}

afterEach(() => vi.restoreAllMocks())

describe('Operational dashboard', () => {
  it('derives current metrics and requests each supported resource once', async () => {
    const fetchMock = renderDashboard('OPERATOR')
    const metrics = await screen.findByRole('region', { name: 'Indicadores operacionais' })
    expect(await within(metrics).findByText('12,30 kg')).toBeVisible()
    expect(within(metrics).getByText('Apiários').closest('article')).toHaveTextContent('2')
    expect(within(metrics).getByText('Ciclos ativos').closest('article')).toHaveTextContent('1')
    expect(await screen.findByText('Cliente recente')).toBeVisible()
    const resourceCalls = fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => !url.endsWith('/auth/me'))
    expect(resourceCalls).toHaveLength(5)
    expect(new Set(resourceCalls).size).toBe(5)
    expect(resourceCalls.some((url) => url.includes('/dashboard'))).toBe(false)
    expect(screen.getByRole('link', { name: 'Ver apiários' })).toBeVisible()
  })

  it('keeps available sections visible when one resource fails', async () => {
    renderDashboard('ADMIN', { failPath: '/honey-batches' })
    expect(await screen.findByText('Cliente recente')).toBeVisible()
    const metrics = screen.getByRole('region', { name: 'Indicadores operacionais' })
    expect(within(metrics).getByText('Apiários').closest('article')).toHaveTextContent('2')
    expect(within(metrics).getByText('Mel disponível').closest('article')).toHaveTextContent('Indisponível')
    expect(screen.getAllByText('Dados temporariamente indisponíveis.')).toHaveLength(2)
  })

  it('shows meaningful empty states when the cooperative has no operational data', async () => {
    renderDashboard('ADMIN', { resources: { '/apiaries': [], '/hives': [], '/production-cycles': [], '/honey-batches': [], '/orders': [] } })
    expect(await screen.findByText('Nenhum pedido cadastrado.')).toBeVisible()
    const metrics = await screen.findByRole('region', { name: 'Indicadores operacionais' })
    expect(within(metrics).getByText('Apiários').closest('article')).toHaveTextContent('0')
    expect(within(metrics).getByText('Mel disponível').closest('article')).toHaveTextContent('0,00 kg')
  })

  it('announces loading while dashboard resources are pending', async () => {
    renderDashboard('OPERATOR', { pending: true })
    const metrics = await screen.findByRole('region', { name: 'Indicadores operacionais' })
    expect(within(metrics).getAllByRole('article')).toHaveLength(7)
    within(metrics).getAllByRole('article').forEach((card) => expect(card).toHaveAttribute('aria-busy', 'true'))
    expect(screen.getByText('Carregando colmeias por condição')).toBeVisible()
    expect(screen.getByText('Carregando pedidos recentes')).toBeVisible()
  })
})