import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input, Select, Table, Textarea } from './ui'

describe('shared UI primitives', () => {
  it('associates labels and validation feedback with fields', () => {
    render(<><Input label="Código" error="Campo obrigatório." /><Select label="Situação" options={[{ value: 'ACTIVE', label: 'Ativo' }]} /><Textarea label="Observações" /></>)
    expect(screen.getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Campo obrigatório.')).toHaveAttribute('role', 'alert')
    expect(screen.getByLabelText('Situação')).toBeInTheDocument()
    expect(screen.getByLabelText('Observações')).toBeInTheDocument()
  })

  it('renders typed table rows and an accessible caption', () => {
    render(<Table caption="Usuários" rows={[{ id: '1', name: 'Ana' }]} getRowKey={(row) => row.id} columns={[{ key: 'name', header: 'Nome', render: (row) => row.name }]} />)
    expect(screen.getByRole('table', { name: 'Usuários' })).toBeVisible()
    expect(screen.getByRole('cell', { name: 'Ana' })).toBeVisible()
  })
})