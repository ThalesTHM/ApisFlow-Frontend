import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check, Eye, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { honeyBatchesApi, honeyBatchKeys } from '../../api/honey-batches'
import { ordersApi, orderKeys } from '../../api/orders'
import type { CreateOrderRequest, Order } from '../../api/types'
import { PermissionGuard } from '../../auth/PermissionGuard'
import { ContentCard, DetailPage, TablePage } from '../../components/PageLayouts'
import { notify } from '../../components/notifications'
import { Badge, Button, Dialog, EmptyState, ErrorState, Spinner, Table } from '../../components/ui'
import { formatCurrency, formatDate, formatKilograms, formatStatus } from '../../utils/format'
import { OrderForm } from './OrderForm'
import { allowedOrderTransitions } from './order-schema'
import './orders.css'

const transitionCopy: Record<'CONFIRMED' | 'CANCELLED', { title: string; description: string; action: string }> = {
  CONFIRMED: { title: 'Confirmar pedido', description: 'Confirmar este pedido? O estoque será baixado pelo servidor e esta ação não poderá ser revertida.', action: 'Confirmar pedido' },
  CANCELLED: { title: 'Cancelar pedido', description: 'Cancelar este pedido? Esta ação não poderá ser revertida.', action: 'Cancelar pedido' },
}

function StatusDialog({ order, status, onClose }: { order: Order; status: 'CONFIRMED' | 'CANCELLED'; onClose: () => void }) {
  const queryClient = useQueryClient()
  const copy = transitionCopy[status]
  const mutation = useMutation({ mutationFn: () => ordersApi.updateStatus(order.id, status), onSuccess: async (saved) => { queryClient.setQueryData(orderKeys.detail(saved.id), saved); await Promise.all([queryClient.invalidateQueries({ queryKey: orderKeys.lists }), queryClient.invalidateQueries({ queryKey: honeyBatchKeys.all })]); notify.success(status === 'CONFIRMED' ? 'Pedido confirmado com sucesso.' : 'Pedido cancelado com sucesso.'); onClose() } })
  return <Dialog title={copy.title} onClose={onClose}><p className="dialog-copy">{copy.description}</p>{mutation.error && <p className="form-error form-pad" role="alert">{mutation.error instanceof Error ? mutation.error.message : 'Não foi possível alterar o pedido.'}</p>}<footer className="form-actions"><Button variant="secondary" onClick={onClose}>Voltar</Button><Button variant={status === 'CANCELLED' ? 'danger' : 'primary'} disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Processando…' : copy.action}</Button></footer></Dialog>
}

export function OrderListPage() {
  const orders = useQuery({ queryKey: orderKeys.list(), queryFn: ordersApi.list })
  const columns = [
    { key: 'customer', header: 'Cliente', render: (order: Order) => <Link to={`/orders/${order.id}`}>{order.customerName}</Link> },
    { key: 'document', header: 'Documento', render: (order: Order) => order.customerDocument },
    { key: 'created', header: 'Criado em', render: (order: Order) => formatDate(order.createdAt) },
    { key: 'total', header: 'Total', render: (order: Order) => <strong>{formatCurrency(order.total)}</strong> },
    { key: 'status', header: 'Situação', render: (order: Order) => <Badge value={order.status} label={formatStatus(order.status)} /> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, render: (order: Order) => <div className="row-actions"><Link className="icon-button" to={`/orders/${order.id}`} aria-label={`Ver pedido de ${order.customerName}`} title="Ver detalhes"><Eye size={17} /></Link></div> },
  ]
  return <TablePage title="Pedidos" description="Acompanhe vendas, valores e situações dos pedidos." actions={<PermissionGuard permission="operations:write"><Link className="button button--primary button-link" to="/orders/new"><Plus size={17} /> Novo pedido</Link></PermissionGuard>}>{orders.isPending ? <Spinner label="Carregando pedidos" /> : orders.isError ? <ErrorState error={orders.error} onRetry={() => orders.refetch()} /> : orders.data.length === 0 ? <EmptyState title="Nenhum pedido cadastrado" description="Crie o primeiro pedido de venda." /> : <Table caption="Pedidos" rows={orders.data} getRowKey={(order) => order.id} columns={columns} />}</TablePage>
}

function StatusActions({ order, onTransition }: { order: Order; onTransition: (status: 'CONFIRMED' | 'CANCELLED') => void }) {
  const transitions = allowedOrderTransitions(order.status)
  const canConfirm = transitions.includes('CONFIRMED')
  const canCancel = transitions.includes('CANCELLED')
  return <PermissionGuard permission="orders:manage-status"><Button disabled={!canConfirm} onClick={() => canConfirm && onTransition('CONFIRMED')}><Check size={17} /> Confirmar pedido</Button><Button variant="danger" disabled={!canCancel} onClick={() => canCancel && onTransition('CANCELLED')}><Ban size={17} /> Cancelar pedido</Button></PermissionGuard>
}

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const [transition, setTransition] = useState<'CONFIRMED' | 'CANCELLED'>()
  const order = useQuery({ queryKey: orderKeys.detail(id), queryFn: () => ordersApi.get(id), enabled: Boolean(id) })
  if (order.isPending) return <main className="page"><Spinner label="Carregando pedido" /></main>
  if (order.isError) return <main className="page"><ErrorState error={order.error} onRetry={() => order.refetch()} /></main>
  const data = order.data
  return <DetailPage title={data.customerName} description={`Pedido criado em ${formatDate(data.createdAt)}`} actions={<><Link className="button button--secondary button-link" to="/orders">Voltar</Link><StatusActions order={data} onTransition={setTransition} /></>}><ContentCard title="Resumo"><dl className="detail-list"><div><dt>Documento</dt><dd>{data.customerDocument}</dd></div><div><dt>Situação</dt><dd><Badge value={data.status} label={formatStatus(data.status)} /></dd></div><div><dt>Total calculado</dt><dd className="order-detail-total">{formatCurrency(data.total)}</dd></div></dl></ContentCard><ContentCard title="Itens do pedido" description="Valores calculados pelo servidor.">{!data.items?.length ? <EmptyState title="Nenhum item retornado" description="Os detalhes deste pedido não possuem itens." /> : <div className="order-detail-items">{data.items.map((item) => <article className="order-detail-item" key={item.id}><div><strong>{item.honeyBatch?.code ?? 'Lote não encontrado'}</strong><span>{item.honeyBatch?.productionCycle?.hive?.code ? `Colmeia ${item.honeyBatch.productionCycle.hive.code}` : 'Origem não informada'}</span></div><dl><div><dt>Quantidade</dt><dd>{formatKilograms(item.quantityKg)}</dd></div><div><dt>Preço unitário</dt><dd>{formatCurrency(item.unitPrice)}</dd></div><div><dt>Subtotal</dt><dd>{formatCurrency(item.subtotal)}</dd></div></dl></article>)}</div>}</ContentCard>{transition && <StatusDialog order={data} status={transition} onClose={() => setTransition(undefined)} />}</DetailPage>
}

export function OrderCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const batches = useQuery({ queryKey: honeyBatchKeys.list(), queryFn: honeyBatchesApi.list })
  const mutation = useMutation({ mutationFn: (values: CreateOrderRequest) => ordersApi.create(values), onSuccess: async (saved) => { queryClient.setQueryData(orderKeys.detail(saved.id), saved); await queryClient.invalidateQueries({ queryKey: orderKeys.lists }); notify.success('Pedido criado com sucesso.'); navigate(`/orders/${saved.id}`) } })
  if (batches.isPending) return <main className="page"><Spinner label="Carregando lotes" /></main>
  if (batches.isError) return <main className="page"><ErrorState error={batches.error} onRetry={() => batches.refetch()} /></main>
  const available = batches.data.filter((batch) => batch.status === 'AVAILABLE')
  if (available.length === 0) return <main className="page"><EmptyState title="Nenhum lote disponível" description="É necessário ter estoque disponível para criar um pedido." /></main>
  return <OrderForm batches={available} busy={mutation.isPending} onSubmit={mutation.mutateAsync} onCancel={() => navigate('/orders')} />
}