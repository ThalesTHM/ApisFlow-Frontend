import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthResponse } from '../api/types'
import { SESSION_KEY } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { AppShell } from './AppShell'

describe('AppShell authorization', () => {
  afterEach(() => vi.restoreAllMocks())

  it('does not expose user management to operators', async () => {
    const session: AuthResponse = { accessToken: 'token', tenant: { id: crypto.randomUUID(), name: 'Cooperativa Norte', slug: 'norte' }, user: { id: crypto.randomUUID(), tenantId: crypto.randomUUID(), name: 'Ana Operadora', email: 'ana@example.com', role: 'OPERATOR', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(session.user), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    render(<MemoryRouter><AuthProvider><AppShell><div>Conteúdo</div></AppShell></AuthProvider></MemoryRouter>)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/auth/me', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) })))
    expect(screen.getByText('Conteúdo')).toBeVisible()
    expect(screen.queryByRole('link', { name: /Usuários/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pedidos/ })).toBeVisible()
  })
})