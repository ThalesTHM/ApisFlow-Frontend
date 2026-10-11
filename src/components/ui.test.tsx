import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { Badge, Dialog, ErrorState, Input, Select, Table, TableSkeleton, Textarea } from './ui'

describe('shared UI primitives', () => {
  it('associates labels and validation feedback with fields', () => {
    render(<><Input label="Código" error="Campo obrigatório." /><Select label="Situação" options={[{ value: 'ACTIVE', label: 'Ativo' }]} /><Textarea label="Observações" /></>)
    expect(screen.getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Campo obrigatório.')).toHaveAttribute('role', 'alert')
    expect(screen.getByLabelText('Situação')).toBeInTheDocument()
    expect(screen.getByLabelText('Observações')).toBeInTheDocument()
  })

  it('renders typed table rows and an accessible caption', () => {
    render(<><Table caption="Usuários" rows={[{ id: '1', name: 'Ana' }]} getRowKey={(row) => row.id} columns={[{ key: 'name', header: 'Nome', render: (row) => row.name }]} /><Badge value="STRONG" label="Forte" /></>)
    expect(screen.getByRole('table', { name: 'Usuários' })).toBeVisible()
    expect(screen.getByRole('cell', { name: 'Ana' })).toBeVisible()
    expect(screen.getByText('Forte')).toHaveClass('badge--strong')
  })

  it('moves focus into dialogs, traps keyboard focus, closes on Escape, and restores focus', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const { unmount } = render(<Dialog title="Confirmar ação" onClose={onClose}><button>Primeira ação</button><button>Última ação</button></Dialog>)
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Última ação' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it.each([
    [403, 'Acesso não permitido', 'Você não tem permissão para esta ação.'],
    [404, 'Registro não encontrado', 'O registro solicitado não foi encontrado.'],
    [409, 'Conflito de dados', 'Não foi possível concluir porque os dados entram em conflito com o estado atual.'],
  ])('renders an actionable status-aware error for HTTP %s', (status, title, message) => {
    render(<ErrorState error={new ApiError(status)} onRetry={() => undefined} />)
    expect(screen.getByRole('alert')).toHaveTextContent(title)
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  })

  it('announces table skeletons without exposing decorative rows', () => {
    render(<TableSkeleton label="Carregando pedidos" columns={3} />)
    expect(screen.getByRole('status', { name: 'Carregando pedidos' })).toBeVisible()
  })
})