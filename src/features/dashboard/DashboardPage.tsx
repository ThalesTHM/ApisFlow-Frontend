import { useQuery } from '@tanstack/react-query'
import { Boxes, CheckCircle2, CircleX, Clock3, Factory, Hexagon, MapPinned, PackageOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiariesApi, apiaryKeys } from '../../api/apiaries'
import { hivesApi, hiveKeys } from '../../api/hives'
import { honeyBatchesApi, honeyBatchKeys } from '../../api/honey-batches'
import { ordersApi, orderKeys } from '../../api/orders'
import { productionCyclesApi, productionCycleKeys } from '../../api/production-cycles'
import type { Order, OrderStatus } from '../../api/types'
import { PermissionGuard } from '../../auth/PermissionGuard'
import { PageHeader } from '../../components/PageLayouts'
import { Badge, Spinner } from '../../components/ui'
import { formatCurrency, formatDate, formatKilograms, formatStatus } from '../../utils/format'
import { selectBatchSummary, selectCycleStatusSummary, selectDashboardMetrics, selectHiveStatusSummary, selectRecentOrders } from './dashboard-selectors'
import './dashboard.css'

const sharedQueryOptions = { staleTime: 30_000 }

function MetricCard({ label, value, pending, error, icon, to }: { label: string; value: string | number; pending: boolean; error: unknown; icon: React.ReactNode; to: string }) {
  return <article className="dashboard-metric" aria-busy={pending}><div className="dashboard-metric__icon">{icon}</div><div><span>{label}</span>{pending ? <><i className="inline-skeleton" aria-hidden="true" /><small className="sr-only">Carregando</small></> : error ? <small className="dashboard-error">Indisponível</small> : <strong>{value}</strong>}</div><PermissionGuard permission="operations:read"><Link to={to} aria-label={`Ver ${label.toLowerCase()}`}>Ver dados</Link></PermissionGuard></article>
}

function SummaryPanel({ title, pending, error, children }: { title: string; pending: boolean; error: unknown; children: React.ReactNode }) {
  return <section className="dashboard-panel"><header><h2>{title}</h2></header>{pending ? <Spinner label={`Carregando ${title.toLowerCase()}`} /> : error ? <p className="dashboard-error" role="status">Dados temporariamente indisponíveis.</p> : children}</section>
}

function Distribution({ values }: { values: Array<{ label: string; value: number; status?: string }> }) {
  const total = values.reduce((sum, item) => sum + item.value, 0)
  return <div className="dashboard-distribution">{values.map((item) => <div key={item.label}><span>{item.status ? <Badge value={item.status} label={item.label} /> : item.label}</span><strong>{item.value}</strong><div className="dashboard-bar"><span style={{ width: `${total ? (item.value / total) * 100 : 0}%` }} /></div></div>)}</div>
}

function RecentOrders({ orders }: { orders: Order[] }) {
  const recent = selectRecentOrders(orders)
  if (!recent.length) return <p className="dashboard-empty">Nenhum pedido cadastrado.</p>
  return <div className="recent-orders">{recent.map((order) => <Link to={`/orders/${order.id}`} key={order.id}><div><strong>{order.customerName}</strong><span>{formatDate(order.createdAt)}</span></div><div><strong>{formatCurrency(order.total)}</strong><Badge value={order.status} label={formatStatus(order.status)} /></div></Link>)}</div>
}

export function DashboardPage() {
  const apiaries = useQuery({ queryKey: apiaryKeys.all, queryFn: apiariesApi.list, ...sharedQueryOptions })
  const hives = useQuery({ queryKey: hiveKeys.list({}), queryFn: () => hivesApi.list(), ...sharedQueryOptions })
  const cycles = useQuery({ queryKey: productionCycleKeys.list({}), queryFn: () => productionCyclesApi.list(), ...sharedQueryOptions })
  const batches = useQuery({ queryKey: honeyBatchKeys.list(), queryFn: honeyBatchesApi.list, ...sharedQueryOptions })
  const orders = useQuery({ queryKey: orderKeys.list(), queryFn: ordersApi.list, ...sharedQueryOptions })
  const metrics = selectDashboardMetrics({ apiaries: apiaries.data ?? [], hives: hives.data ?? [], cycles: cycles.data ?? [], batches: batches.data ?? [], orders: orders.data ?? [] })
  const hiveSummary = selectHiveStatusSummary(hives.data ?? [])
  const cycleSummary = selectCycleStatusSummary(cycles.data ?? [])
  const batchSummary = selectBatchSummary(batches.data ?? [])
  const orderMetric = (status: OrderStatus) => status === 'PENDING' ? metrics.pendingOrders : status === 'CONFIRMED' ? metrics.confirmedOrders : metrics.cancelledOrders
  return <main className="page dashboard-page"><PageHeader eyebrow="Visão operacional" title="Dashboard" description="Retrato atual dos recursos e operações da cooperativa." /><section className="dashboard-metrics" aria-label="Indicadores operacionais"><MetricCard label="Apiários" value={metrics.totalApiaries} pending={apiaries.isPending} error={apiaries.error} icon={<MapPinned />} to="/apiaries" /><MetricCard label="Colmeias" value={metrics.totalHives} pending={hives.isPending} error={hives.error} icon={<Hexagon />} to="/hives" /><MetricCard label="Ciclos ativos" value={metrics.activeProductionCycles} pending={cycles.isPending} error={cycles.error} icon={<Factory />} to="/production-cycles" /><MetricCard label="Mel disponível" value={formatKilograms(metrics.availableHoneyKg)} pending={batches.isPending} error={batches.error} icon={<PackageOpen />} to="/honey-batches" />{(['PENDING', 'CONFIRMED', 'CANCELLED'] as OrderStatus[]).map((status) => <MetricCard key={status} label={`Pedidos ${formatStatus(status).toLowerCase()}s`} value={orderMetric(status)} pending={orders.isPending} error={orders.error} icon={status === 'PENDING' ? <Clock3 /> : status === 'CONFIRMED' ? <CheckCircle2 /> : <CircleX />} to="/orders" />)}</section><div className="dashboard-grid"><SummaryPanel title="Colmeias por condição" pending={hives.isPending} error={hives.error}><Distribution values={Object.entries(hiveSummary).map(([status, value]) => ({ label: formatStatus(status as keyof typeof hiveSummary), value, status }))} /></SummaryPanel><SummaryPanel title="Ciclos por situação" pending={cycles.isPending} error={cycles.error}><Distribution values={Object.entries(cycleSummary).map(([status, value]) => ({ label: formatStatus(status as keyof typeof cycleSummary), value, status }))} /></SummaryPanel><SummaryPanel title="Lotes por qualidade" pending={batches.isPending} error={batches.error}><Distribution values={Object.entries(batchSummary.quality).map(([status, value]) => ({ label: formatStatus(status as keyof typeof batchSummary.quality), value, status }))} /></SummaryPanel><SummaryPanel title="Lotes por situação" pending={batches.isPending} error={batches.error}><Distribution values={Object.entries(batchSummary.status).map(([status, value]) => ({ label: formatStatus(status as keyof typeof batchSummary.status), value, status }))} /></SummaryPanel><SummaryPanel title="Pedidos recentes" pending={orders.isPending} error={orders.error}><RecentOrders orders={orders.data ?? []} /></SummaryPanel></div><footer className="dashboard-note"><Boxes size={18} /><span>Indicadores calculados a partir do estado atual dos recursos.</span></footer></main>
}