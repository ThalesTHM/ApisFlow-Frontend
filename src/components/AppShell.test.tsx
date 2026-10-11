import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthResponse, UserRole } from '../api/types'
import { SESSION_KEY } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { PermissionGuard } from '../auth/PermissionGuard'
import { AppRoutes } from '../routes/AppRoutes'

function sessionFor(role: UserRole): AuthResponse {
  return { accessToken: 'token', tenant: { id: crypto.randomUUID(), name: 'Cooperativa Norte', slug: 'norte' }, user: { id: crypto.randomUUID(), tenantId: crypto.randomUUID(), name: `${role} User`, email: `${role.toLowerCase()}@example.com`, role, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
}

function renderShell(role: UserRole, path = '/') {
  const session = sessionFor(role)
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => Promise.resolve(new Response(JSON.stringify(String(input).endsWith('/auth/me') ? session.user : []), { status: 200, headers: { 'Content-Type': 'application/json' } })))
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[path]}><AuthProvider><AppRoutes /></AuthProvider></MemoryRouter></QueryClientProvider>)
}

describe('application shell authorization', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(['ADMIN', 'MANAGER'] as const)('shows Users to %s and permits the direct route', async (role) => {
    renderShell(role, '/users')
    expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeVisible()
    expect(screen.getByRole('link', { name: /Usuários/ })).toBeVisible()
  })

  it('hides Users from operators and blocks direct route access', async () => {
    renderShell('OPERATOR', '/users')
    expect(await screen.findByRole('heading', { name: 'Permissão insuficiente' })).toBeVisible()
    expect(screen.queryByRole('link', { name: /Usuários/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pedidos/ })).toBeVisible()
  })

  it('enforces write and order status permissions at action level', async () => {
    const { unmount } = renderShell('OPERATOR')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible()
    render(<MemoryRouter><AuthProvider><PermissionGuard permission="operations:write"><button>Editar apiário</button></PermissionGuard><PermissionGuard permission="orders:manage-status"><button>Confirmar pedido</button></PermissionGuard></AuthProvider></MemoryRouter>)
    expect(screen.queryByRole('button', { name: 'Editar apiário' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar pedido' })).not.toBeInTheDocument()
    unmount()
  })

  it('opens and closes the responsive sidebar control', async () => {
    const user = userEvent.setup()
    renderShell('ADMIN')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(screen.getByLabelText('Barra lateral')).toHaveClass('sidebar--open')
    await user.click(screen.getByRole('button', { name: 'Fechar menu' }))
    expect(screen.getByLabelText('Barra lateral')).not.toHaveClass('sidebar--open')
  })
})