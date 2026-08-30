import { useQueries } from '@tanstack/react-query'
import Decimal from 'decimal.js'
import { Boxes, CircleDollarSign, PackageOpen, Warehouse } from 'lucide-react'
import { api } from '../../api/client'
import type { Apiary, Hive, HoneyBatch, Order } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { Badge, ErrorState, Spinner } from '../../components/ui'

export function DashboardPage() {
  const { session } = useAuth()
  const results = useQueries({ queries: [{ queryKey: ['apiaries'], queryFn: () => api.get<Apiary[]>('/apiaries') }, { queryKey: ['hives'], queryFn: () => api.get<Hive[]>('/hives') }, { queryKey: ['honey-batches'], queryFn: () => api.get<HoneyBatch[]>('/honey-batches') }, { queryKey: ['orders'], queryFn: () => api.get<Order[]>('/orders') }] })
  if (results.some((result) => result.isLoading)) return <main className="page"><Spinner label="Consolidando operação" /></main>
  const failed = results.find((result) => result.isError)
  if (failed) return <main className="page"><ErrorState error={failed.error} onRetry={() => results.forEach((result) => result.refetch())} /></main>
  const [apiaries, hives, batches, orders] = results.map((result) => result.data ?? []) as [Apiary[], Hive[], HoneyBatch[], Order[]]
  const confirmed = orders.filter((order) => order.status === 'CONFIRMED').reduce((sum, order) => sum.add(order.total), new Decimal(0)); const available = batches.reduce((sum, batch) => sum.add(batch.availableQuantityKg), new Decimal(0)); const recent = [...orders].slice(0, 5)
  return <main className="page dashboard"><header className="page-header"><div><p className="eyebrow">Resumo operacional</p><h1>Olá, {session?.user.name.split(' ')[0]}</h1><p>Acompanhe os indicadores atuais da cooperativa.</p></div></header><section className="metric-grid"><article><Warehouse size={20} /><span>Apiários</span><strong>{apiaries.length}</strong><small>locais cadastrados</small></article><article><Boxes size={20} /><span>Colmeias</span><strong>{hives.length}</strong><small>{hives.filter((hive) => hive.colonyStatus === 'STRONG').length} colônias fortes</small></article><article><PackageOpen size={20} /><span>Estoque disponível</span><strong>{available.toFixed(2)} kg</strong><small>em {batches.filter((batch) => batch.status === 'AVAILABLE').length} lotes</small></article><article><CircleDollarSign size={20} /><span>Pedidos confirmados</span><strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(confirmed.toNumber())}</strong><small>{orders.filter((order) => order.status === 'PENDING').length} aguardando decisão</small></article></section><section className="dashboard-section"><div className="section-heading"><div><h2>Pedidos recentes</h2><p>Últimas movimentações comerciais</p></div></div>{recent.length ? <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Data</th><th>Total</th><th>Situação</th></tr></thead><tbody>{recent.map((order) => <tr key={order.id}><td><strong>{order.customerName}</strong></td><td>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td><td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(new Decimal(order.total).toNumber())}</td><td><Badge value={order.status} /></td></tr>)}</tbody></table></div> : <p className="muted">Nenhum pedido registrado.</p>}</section></main>
}