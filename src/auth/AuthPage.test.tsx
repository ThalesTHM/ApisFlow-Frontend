import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_KEY } from '../api/client'
import type { AuthResponse } from '../api/types'
import { AppRoutes } from '../routes/AppRoutes'
import { AuthProvider } from './AuthContext'

const session: AuthResponse = {
  accessToken: 'signed-token',
  tenant: { id: '0bb74555-6587-4f2a-824b-d39bbdcbe085', name: 'Cooperativa Norte', slug: 'cooperativa-norte' },
  user: { id: '9eeb35f7-6e9d-4eb4-a063-69db56fbb643', tenantId: '0bb74555-6587-4f2a-824b-d39bbdcbe085', name: 'Ana Admin', email: 'ana@example.com', role: 'ADMIN', isActive: true, createdAt: '2026-08-30T10:00:00.000Z', updatedAt: '2026-08-30T10:00:00.000Z' },
}

function renderApp(path = '/login') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[path]}><AuthProvider><AppRoutes /></AuthProvider></MemoryRouter></QueryClientProvider>)
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => vi.restoreAllMocks())

describe('authentication flow', () => {
  it('logs in successfully and persists the documented session', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => Promise.resolve(jsonResponse(String(input).endsWith('/auth/login') ? session : [])))
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText('Organização'), 'cooperativa-norte')
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible()
    expect(JSON.parse(localStorage.getItem(SESSION_KEY) ?? '{}')).toEqual(session)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ tenantSlug: 'cooperativa-norte', email: 'ana@example.com', password: 'password123' }),
    }))
  })

  it('registers a cooperative and starts an authenticated session', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => Promise.resolve(jsonResponse(String(input).endsWith('/auth/register') ? session : [])))
    const user = userEvent.setup()
    renderApp('/register')

    await user.type(screen.getByLabelText('Cooperativa'), 'Cooperativa Norte')
    await user.type(screen.getByLabelText('Identificador'), 'cooperativa-norte')
    await user.type(screen.getByLabelText('Seu nome'), 'Ana Admin')
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Criar cooperativa' }))

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible()
    expect(JSON.parse(localStorage.getItem(SESSION_KEY) ?? '{}')).toEqual(session)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/auth/register', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ tenantName: 'Cooperativa Norte', tenantSlug: 'cooperativa-norte', name: 'Ana Admin', email: 'ana@example.com', password: 'password123' }),
    }))
  })

  it('shows an invalid credentials message for a rejected login', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ statusCode: 401, error: 'Unauthorized', message: 'Invalid credentials', path: '/auth/login', timestamp: '2026-08-30T10:00:00.000Z' }, 401))
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText('Organização'), 'cooperativa-norte')
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'incorrect')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Organização, e-mail ou senha incorretos.')).toBeVisible()
    expect(screen.queryByText('Sua sessão expirou. Entre novamente.')).not.toBeInTheDocument()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('logs out and clears the persisted session', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => Promise.resolve(jsonResponse(String(input).endsWith('/auth/me') ? session.user : [])))
    const user = userEvent.setup()
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('redirects unauthenticated users away from protected routes', async () => {
    renderApp('/orders')
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Pedidos' })).not.toBeInTheDocument()
  })

  it('does not flash protected content and expires a rejected stored session', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    let resolveRequest: (response: Response) => void = () => undefined
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    renderApp('/')

    expect(screen.getByText('Validando sessão')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument()

    await act(async () => resolveRequest(jsonResponse({ statusCode: 401, error: 'Unauthorized', message: 'Unauthorized', path: '/auth/me', timestamp: '2026-08-30T10:00:00.000Z' }, 401)))
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou. Entre novamente.')
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('validates lowercase tenant slugs and password length during registration', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: 'Criar conta' }))
    await user.type(screen.getByLabelText('Cooperativa'), 'Cooperativa Norte')
    await user.type(screen.getByLabelText('Identificador'), 'Cooperativa-Norte')
    await user.type(screen.getByLabelText('Seu nome'), 'Ana Admin')
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), '1234567')
    await user.click(screen.getByRole('button', { name: 'Criar cooperativa' }))

    expect(await screen.findByText('Use letras minúsculas, números e hífens.')).toBeVisible()
    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeVisible()
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })
})