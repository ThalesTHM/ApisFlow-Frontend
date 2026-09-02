import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { SESSION_KEY } from '../../api/client'
import type { Apiary, AuthResponse, UserRole } from '../../api/types'
import { AuthProvider } from '../../auth/AuthContext'

const apiary: Apiary = {
  id: '3e7ad94e-ea9c-4af0-892a-e34700996d8f', tenantId: 'tenant-1', name: 'Apiário Norte',
  location: 'Campo Norte', latitude: '-23.550520', longitude: '-46.633308', description: 'Área principal',
  createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderApp(path: string, role: UserRole, fetcher: (url: string, init?: RequestInit) => Promise<Response>) {
  const session: AuthResponse = { accessToken: 'token', tenant: { id: 'tenant-1', name: 'Cooperativa Norte', slug: 'norte' }, user: { id: 'user-1', tenantId: 'tenant-1', name: `${role} User`, email: `${role.toLowerCase()}@example.com`, role, isActive: true, createdAt: apiary.createdAt, updatedAt: apiary.updatedAt } }
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

describe('Apiary management', () => {
  it('renders empty and server error list states', async () => {
    const { unmount } = renderApp('/apiaries', 'ADMIN', async () => json([]))
    expect(await screen.findByText('Nenhum apiário cadastrado')).toBeVisible()
    unmount()

    renderApp('/apiaries', 'ADMIN', async () => json({ statusCode: 500, error: 'Error', message: 'Falha ao consultar apiários', path: '/apiaries', timestamp: new Date().toISOString() }, 500))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a operação.')
    expect(screen.queryByText('Falha ao consultar apiários')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  })

  it('creates an apiary, validates paired coordinates, and never sends tenantId', async () => {
    const user = userEvent.setup()
    let requestBody: Record<string, unknown> | undefined
    const { fetchMock } = renderApp('/apiaries/new', 'ADMIN', async (url, init) => {
      if (url.endsWith('/apiaries') && init?.method === 'POST') {
        requestBody = JSON.parse(String(init.body)) as Record<string, unknown>
        return json(apiary, 201)
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await screen.findByRole('heading', { name: 'Novo apiário' })
    await user.type(screen.getByLabelText('Nome'), apiary.name)
    await user.type(screen.getByLabelText('Localização'), apiary.location)
    await user.type(screen.getByLabelText('Latitude'), '-23.550520')
    await user.click(screen.getByRole('button', { name: 'Salvar apiário' }))
    expect(await screen.findByText('Informe latitude e longitude juntas.')).toBeVisible()
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/apiaries'))).toHaveLength(0)

    await user.type(screen.getByLabelText('Longitude'), '-46.633308')
    await user.type(screen.getByLabelText('Descrição'), apiary.description!)
    await user.click(screen.getByRole('button', { name: 'Salvar apiário' }))
    expect(await screen.findByRole('heading', { name: apiary.name })).toBeVisible()
    expect(requestBody).toEqual({ name: apiary.name, location: apiary.location, latitude: -23.55052, longitude: -46.633308, description: apiary.description })
    expect(requestBody).not.toHaveProperty('tenantId')
    expect(await screen.findByText('Apiário criado com sucesso.')).toBeVisible()
  })

  it('loads and updates an apiary, then shows the refreshed detail', async () => {
    const user = userEvent.setup()
    let patchBody: unknown
    renderApp(`/apiaries/${apiary.id}/edit`, 'MANAGER', async (url, init) => {
      if (url.endsWith(`/apiaries/${apiary.id}`) && !init?.method) return json(apiary)
      if (url.endsWith(`/apiaries/${apiary.id}`) && init?.method === 'PATCH') {
        patchBody = JSON.parse(String(init.body))
        return json({ ...apiary, name: 'Apiário Sul', updatedAt: '2026-08-03T00:00:00.000Z' })
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    expect(await screen.findByDisplayValue(apiary.name)).toBeVisible()
    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Apiário Sul')
    await user.click(screen.getByRole('button', { name: 'Salvar apiário' }))
    expect(await screen.findByRole('heading', { name: 'Apiário Sul' })).toBeVisible()
    expect(patchBody).toMatchObject({ name: 'Apiário Sul', location: apiary.location })
    expect(await screen.findByText('Apiário atualizado com sucesso.')).toBeVisible()
  })

  it('deletes only after confirmation and refreshes the list', async () => {
    const user = userEvent.setup()
    let deleted = false
    renderApp('/apiaries', 'ADMIN', async (url, init) => {
      if (url.endsWith(`/apiaries/${apiary.id}`) && init?.method === 'DELETE') { deleted = true; return json({ deleted: true }) }
      if (url.endsWith('/apiaries')) return json(deleted ? [] : [apiary])
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    await user.click(await screen.findByRole('button', { name: `Excluir ${apiary.name}` }))
    expect(screen.getByRole('dialog', { name: 'Excluir apiário' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Nenhum apiário cadastrado')).toBeVisible()
    expect(await screen.findByText('Apiário excluído com sucesso.')).toBeVisible()
  })

  it('shows a safe conflict message inside the form', async () => {
    const user = userEvent.setup()
    renderApp('/apiaries/new', 'ADMIN', async () => json({ statusCode: 409, error: 'Conflict', message: 'Já existe um apiário com este nome.', path: '/apiaries', timestamp: new Date().toISOString() }, 409))
    await user.type(await screen.findByLabelText('Nome'), apiary.name)
    await user.type(screen.getByLabelText('Localização'), apiary.location)
    await user.click(screen.getByRole('button', { name: 'Salvar apiário' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir porque os dados entram em conflito com o estado atual.')
    expect(screen.queryByText('Já existe um apiário com este nome.')).not.toBeInTheDocument()
  })

  it('keeps operators read-only and denies direct write routes', async () => {
    const { unmount } = renderApp('/apiaries', 'OPERATOR', async () => json([apiary]))
    expect(await screen.findByRole('cell', { name: apiary.name })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Novo apiário' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: `Editar ${apiary.name}` })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: `Excluir ${apiary.name}` })).not.toBeInTheDocument()
    unmount()

    renderApp('/apiaries/new', 'OPERATOR', async () => json([]))
    expect(await screen.findByRole('heading', { name: 'Permissão insuficiente' })).toBeVisible()
  })
})