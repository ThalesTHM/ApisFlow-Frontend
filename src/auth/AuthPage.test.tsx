import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from './AuthContext'
import { AuthPage } from './AuthPage'

describe('AuthPage', () => {
  it('shows immediate validation feedback for an empty login', async () => {
    render(<MemoryRouter><AuthProvider><AuthPage /></AuthProvider></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Use pelo menos 2 caracteres.')).toBeVisible()
    expect(screen.getByText('Informe um e-mail válido.')).toBeVisible()
    expect(screen.getByText('Informe sua senha.')).toBeVisible()
  })
})