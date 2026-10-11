import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { SESSION_KEY } from '../../api/client'
import type { AuthResponse, User, UserRole } from '../../api/types'
import { AuthProvider } from '../../auth/AuthContext'

const managedUser: User = { id: '9eeb35f7-6e9d-4eb4-a063-69db56fbb643', tenantId: 'tenant-1', name: 'Maria Operadora', email: 'maria@example.com', role: 'OPERATOR', isActive: true, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z' }

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }

function renderApp(path: string, role: UserRole, fetcher: (url: string, init?: RequestInit) => Promise<Response>) {
  const session: AuthResponse = { accessToken: 'token', tenant: { id: 'tenant-1', name: 'Cooperativa Norte', slug: 'norte' }, user: { ...managedUser, id: 'current-user', name: `${role} User`, email: `${role.toLowerCase()}@example.com`, role } }
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

describe('User management', () => {
  it('lists users for managers without write actions', async () => {
    renderApp('/users', 'MANAGER', async (url) => url.endsWith('/users') ? json([managedUser]) : json([]))
    const row = (await screen.findByRole('link', { name: managedUser.name })).closest('tr')!
    expect(within(row).getByText(managedUser.email)).toBeVisible()
    expect(within(row).getByText('Operador')).toBeVisible()
    expect(within(row).getByText('Ativo')).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Novo usuário' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: `Editar ${managedUser.name}` })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: `Excluir ${managedUser.name}` })).not.toBeInTheDocument()
  })

  it('renders empty and safe server-error list states', async () => {
    const { unmount } = renderApp('/users', 'ADMIN', async () => json([]))
    expect(await screen.findByText('Nenhum usuário cadastrado')).toBeVisible()
    unmount()
    renderApp('/users', 'ADMIN', async () => json({ statusCode: 500, message: 'Database unavailable' }, 500))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a operação.')
    expect(screen.queryByText('Database unavailable')).not.toBeInTheDocument()
  })

  it('validates and creates a tenant-scoped user', async () => {
    const user = userEvent.setup()
    let requestBody: Record<string, unknown> | undefined
    const { fetchMock } = renderApp('/users/new', 'ADMIN', async (url, init) => {
      if (url.endsWith('/users') && init?.method === 'POST') { requestBody = JSON.parse(String(init.body)); return json(managedUser, 201) }
      if (url.endsWith(`/users/${managedUser.id}`)) return json(managedUser)
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await screen.findByRole('heading', { name: 'Novo usuário' })
    await user.click(screen.getByRole('button', { name: 'Salvar usuário' }))
    expect(await screen.findByText('Use pelo menos 2 caracteres.')).toBeVisible()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
    await user.type(screen.getByLabelText('Nome'), managedUser.name)
    await user.type(screen.getByLabelText('E-mail'), managedUser.email)
    await user.type(screen.getByLabelText('Senha'), 'password123')
    await user.selectOptions(screen.getByLabelText('Perfil'), managedUser.role)
    await user.click(screen.getByRole('button', { name: 'Salvar usuário' }))
    expect(await screen.findByRole('heading', { name: managedUser.name })).toBeVisible()
    expect(requestBody).toEqual({ name: managedUser.name, email: managedUser.email, password: 'password123', role: 'OPERATOR' })
    expect(requestBody).not.toHaveProperty('tenantId')
  })

  it('updates role and status while omitting a blank password', async () => {
    const user = userEvent.setup()
    let patchBody: Record<string, unknown> | undefined
    renderApp(`/users/${managedUser.id}/edit`, 'ADMIN', async (url, init) => {
      if (url.endsWith(`/users/${managedUser.id}`) && !init?.method) return json(managedUser)
      if (url.endsWith(`/users/${managedUser.id}`) && init?.method === 'PATCH') { patchBody = JSON.parse(String(init.body)); return json({ ...managedUser, role: 'MANAGER', isActive: false }) }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    expect(await screen.findByDisplayValue(managedUser.name)).toBeVisible()
    await user.selectOptions(screen.getByLabelText('Perfil'), 'MANAGER')
    await user.selectOptions(screen.getByLabelText('Situação'), 'false')
    await user.click(screen.getByRole('button', { name: 'Salvar usuário' }))
    expect(await screen.findByText('Gestor')).toBeVisible()
    expect(screen.getByText('Inativo')).toBeVisible()
    expect(patchBody).toEqual({ name: managedUser.name, email: managedUser.email, role: 'MANAGER', isActive: false })
    expect(patchBody).not.toHaveProperty('password')
  })

  it('deletes only after confirmation and refreshes the list', async () => {
    const user = userEvent.setup()
    let deleted = false
    renderApp('/users', 'ADMIN', async (url, init) => {
      if (url.endsWith(`/users/${managedUser.id}`) && init?.method === 'DELETE') { deleted = true; return json({ deleted: true }) }
      if (url.endsWith('/users')) return json(deleted ? [] : [managedUser])
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await user.click(await screen.findByRole('button', { name: `Excluir ${managedUser.name}` }))
    expect(screen.getByRole('dialog', { name: 'Excluir usuário' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Nenhum usuário cadastrado')).toBeVisible()
    expect(await screen.findByText('Usuário excluído com sucesso.')).toBeVisible()
  })

  it('denies Operators and blocks Manager write routes', async () => {
    const { unmount } = renderApp('/users', 'OPERATOR', async () => json([]))
    expect(await screen.findByRole('heading', { name: 'Permissão insuficiente' })).toBeVisible()
    unmount()
    renderApp('/users/new', 'MANAGER', async () => json([]))
    expect(await screen.findByRole('heading', { name: 'Permissão insuficiente' })).toBeVisible()
  })
})