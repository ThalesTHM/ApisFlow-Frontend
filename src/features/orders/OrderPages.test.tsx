import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { SESSION_KEY } from '../../api/client'
import type { AuthResponse, HoneyBatch, Order, ProductionCycle, UserRole } from '../../api/types'
import { AuthProvider } from '../../auth/AuthContext'

const cycle: ProductionCycle = { id: '74ed7043-1d1f-47f0-a428-cf1eb26a82e4', tenantId: 'tenant-1', hiveId: '67c4e50e-ae02-45f4-9dd3-e266375b3799', startDate: '2026-09-01T00:00:00.000Z', endDate: null, status: 'ACTIVE', estimatedProductionKg: '100.50', actualProductionKg: null, notes: null }
const batch: HoneyBatch = { id: '44e584fc-05e7-4fd9-a0a4-912506ace129', tenantId: 'tenant-1', productionCycleId: cycle.id, code: 'LOTE-001', productionDate: '2026-09-02T00:00:00.000Z', quantityKg: '100.50', availableQuantityKg: '65.25', quality: 'PREMIUM', status: 'AVAILABLE' }
const order: Order = { id: '05435cec-d9c1-46d9-aa8c-da45e12b6b1a', tenantId: 'tenant-1', customerName: 'Mercado Central', customerPhone: '+55 11 91234-5678', status: 'PENDING', total: '46.77', createdAt: '2026-09-02T15:00:00.000Z', items: [{ id: 'item-1', tenantId: 'tenant-1', orderId: '05435cec-d9c1-46d9-aa8c-da45e12b6b1a', honeyBatchId: batch.id, quantityKg: '2.35', unitPrice: '19.90', subtotal: '46.77', honeyBatch: { ...batch, productionCycle: { ...cycle, hive: { id: cycle.hiveId, tenantId: 'tenant-1', apiaryId: 'apiary-1', code: 'HIVE-001', queenStatus: 'PRESENT', colonyStatus: 'STRONG', installationDate: cycle.startDate, notes: null, createdAt: cycle.startDate, updatedAt: cycle.startDate } } } }] }

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }

function renderApp(path: string, role: UserRole, fetcher: (url: string, init?: RequestInit) => Promise<Response>) {
  const session: AuthResponse = { accessToken: 'token', tenant: { id: 'tenant-1', name: 'Cooperativa Norte', slug: 'norte' }, user: { id: 'user-1', tenantId: 'tenant-1', name: `${role} User`, email: `${role.toLowerCase()}@example.com`, role, isActive: true, createdAt: order.createdAt, updatedAt: order.createdAt } }
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

describe('Order management', () => {
  it('creates an order with items and a decimal-safe totals preview', async () => {
    const user = userEvent.setup()
    let requestBody: Record<string, unknown> | undefined
    renderApp('/orders/new', 'ADMIN', async (url, init) => {
      if (url.endsWith('/honey-batches')) return json([batch])
      if (url.endsWith('/orders') && init?.method === 'POST') { requestBody = JSON.parse(String(init.body)); return json(order, 201) }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await user.type(await screen.findByLabelText('Nome do cliente'), order.customerName)
    await user.type(screen.getByLabelText('Telefone'), order.customerPhone!)
    await user.selectOptions(screen.getByLabelText('Lote de mel'), batch.id)
    await user.type(screen.getByLabelText('Quantidade (kg)'), '2.35')
    await user.type(screen.getByLabelText('Preço unitário'), '19.90')
    const summary = screen.getByRole('heading', { name: 'Prévia do pedido' }).closest('section')!
    expect(within(summary).getByText(/46,77/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Criar pedido' }))
    expect(await screen.findByRole('heading', { name: order.customerName })).toBeVisible()
    expect(requestBody).toEqual({ customerName: order.customerName, customerPhone: order.customerPhone, items: [{ honeyBatchId: batch.id, quantityKg: 2.35, unitPrice: 19.9 }] })
    expect(requestBody).not.toHaveProperty('total')
  })

  it('prevents adding the same batch twice', async () => {
    const user = userEvent.setup()
    const { fetchMock } = renderApp('/orders/new', 'ADMIN', async (url) => url.endsWith('/honey-batches') ? json([batch]) : json(order, 201))
    await screen.findByLabelText('Nome do cliente')
    await user.type(screen.getByLabelText('Nome do cliente'), order.customerName)
    await user.type(screen.getByLabelText('Telefone'), order.customerPhone!)
    await user.selectOptions(screen.getByLabelText('Lote de mel'), batch.id)
    await user.type(screen.getByLabelText('Quantidade (kg)'), '1.00')
    await user.type(screen.getByLabelText('Preço unitário'), '10.00')
    await user.click(screen.getByRole('button', { name: 'Adicionar item' }))
    await user.selectOptions(screen.getAllByLabelText('Lote de mel')[1], batch.id)
    await user.type(screen.getAllByLabelText('Quantidade (kg)')[1], '1.00')
    await user.type(screen.getAllByLabelText('Preço unitário')[1], '10.00')
    await user.click(screen.getByRole('button', { name: 'Criar pedido' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este lote já foi adicionado ao pedido.')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('transitions a pending order to confirmed', async () => {
    const user = userEvent.setup()
    let patchBody: unknown
    renderApp(`/orders/${order.id}`, 'MANAGER', async (url, init) => {
      if (url.endsWith(`/orders/${order.id}`) && !init?.method) return json(order)
      if (url.endsWith(`/orders/${order.id}/status`) && init?.method === 'PATCH') { patchBody = JSON.parse(String(init.body)); return json({ ...order, status: 'CONFIRMED' }) }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await user.click(await screen.findByRole('button', { name: 'Confirmar pedido' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirmar pedido' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pedido' }))
    expect(await screen.findByText('Confirmado', { selector: '.badge' })).toBeVisible()
    expect(patchBody).toEqual({ status: 'CONFIRMED' })
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled()
  })

  it('transitions a pending order to cancelled', async () => {
    const user = userEvent.setup()
    let patchBody: unknown
    renderApp(`/orders/${order.id}`, 'ADMIN', async (url, init) => {
      if (url.endsWith(`/orders/${order.id}`) && !init?.method) return json(order)
      if (url.endsWith(`/orders/${order.id}/status`) && init?.method === 'PATCH') { patchBody = JSON.parse(String(init.body)); return json({ ...order, status: 'CANCELLED' }) }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await user.click(await screen.findByRole('button', { name: 'Cancelar pedido' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancelar pedido' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar pedido' }))
    expect(await screen.findByText('Cancelado', { selector: '.badge' })).toBeVisible()
    expect(patchBody).toEqual({ status: 'CANCELLED' })
  })

  it('disables invalid transitions for finalized orders', async () => {
    const { fetchMock } = renderApp(`/orders/${order.id}`, 'MANAGER', async (url) => url.endsWith(`/orders/${order.id}`) ? json({ ...order, status: 'CONFIRMED' }) : json([]))
    expect(await screen.findByRole('button', { name: 'Confirmar pedido' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar pedido' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Pendente/ })).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
  })

  it('keeps confirmation explicit and presents insufficient-stock 409 conflicts', async () => {
    const user = userEvent.setup()
    renderApp(`/orders/${order.id}`, 'MANAGER', async (url, init) => {
      if (url.endsWith(`/orders/${order.id}`) && !init?.method) return json(order)
      return json({ statusCode: 409, error: 'Conflict', message: 'Insufficient stock for batch LOTE-001', path: `/orders/${order.id}/status`, timestamp: new Date().toISOString() }, 409)
    })
    await user.click(await screen.findByRole('button', { name: 'Confirmar pedido' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirmar pedido' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pedido' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Não foi possível concluir porque os dados entram em conflito com o estado atual.')
    expect(within(dialog).queryByText('Insufficient stock for batch LOTE-001')).not.toBeInTheDocument()
    expect(screen.getByText('Pendente', { selector: '.badge' })).toBeVisible()
  })
})