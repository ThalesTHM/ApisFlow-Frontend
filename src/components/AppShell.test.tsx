import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { AuthResponse } from '../api/types'
import { SESSION_KEY } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { AppShell } from './AppShell'

describe('AppShell authorization', () => {
  it('does not expose user management to operators', () => {
    const session: AuthResponse = { accessToken: 'token', tenant: { id: crypto.randomUUID(), name: 'Cooperativa Norte', slug: 'norte' }, user: { id: crypto.randomUUID(), tenantId: crypto.randomUUID(), name: 'Ana Operadora', email: 'ana@example.com', role: 'OPERATOR', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    render(<MemoryRouter><AuthProvider><AppShell><div>Conteúdo</div></AppShell></AuthProvider></MemoryRouter>)
    expect(screen.getByText('Conteúdo')).toBeVisible()
    expect(screen.queryByRole('link', { name: /Usuários/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pedidos/ })).toBeVisible()
  })
})