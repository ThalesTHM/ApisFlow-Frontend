import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContentCard, DetailPage, FormPage, PageActions, PageHeader, TablePage } from './PageLayouts'

describe('page layout patterns', () => {
  it('composes page headers, actions, and content cards', () => {
    render(<><PageHeader title="Apiários" description="Locais cadastrados" actions={<button>Novo</button>} /><ContentCard title="Resumo"><p>Conteúdo</p></ContentCard><PageActions><button>Exportar</button></PageActions></>)
    expect(screen.getByRole('heading', { name: 'Apiários' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Resumo' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Novo' })).toBeVisible()
  })

  it('renders table, detail, and form page semantics', () => {
    const submit = vi.fn((event) => event.preventDefault())
    render(<><TablePage title="Pedidos"><div>Lista</div></TablePage><DetailPage title="Pedido 001"><div>Detalhes</div></DetailPage><FormPage title="Novo pedido" onSubmit={submit}><button type="submit">Salvar</button></FormPage></>)
    expect(screen.getByText('Lista')).toBeVisible()
    expect(screen.getByText('Detalhes')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Salvar' }).closest('form')).toHaveClass('form-layout')
  })
})