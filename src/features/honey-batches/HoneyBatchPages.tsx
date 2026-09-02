import Decimal from 'decimal.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { honeyBatchesApi, honeyBatchKeys } from '../../api/honey-batches'
import { productionCyclesApi, productionCycleKeys } from '../../api/production-cycles'
import type { HoneyBatch, HoneyBatchRequest, ProductionCycle } from '../../api/types'
import { PermissionGuard } from '../../auth/PermissionGuard'
import { ContentCard, DetailPage, TablePage } from '../../components/PageLayouts'
import { notify } from '../../components/notifications'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Spinner, Table } from '../../components/ui'
import { formatDate, formatKilograms, formatStatus } from '../../utils/format'
import { HoneyBatchForm } from './HoneyBatchForm'
import './honey-batches.css'

function cycleLabel(cycle: ProductionCycle | undefined) {
  return cycle ? `${formatDate(cycle.startDate)} · ${formatStatus(cycle.status)}` : 'Ciclo não encontrado'
}

function StockDisplay({ batch }: { batch: HoneyBatch }) {
  const total = new Decimal(batch.quantityKg)
  const available = new Decimal(batch.availableQuantityKg)
  const percentage = total.isZero() ? 0 : Decimal.min(100, Decimal.max(0, available.div(total).times(100))).toNumber()
  return <div className="stock-display"><div><strong>{formatKilograms(batch.availableQuantityKg)}</strong><span> de {formatKilograms(batch.quantityKg)}</span></div><div className="stock-meter" role="progressbar" aria-label={`Estoque disponível do lote ${batch.code}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}><span style={{ width: `${percentage}%` }} /></div></div>
}

function BatchDeleteDialog({ batch, onClose, onDeleted }: { batch: HoneyBatch; onClose: () => void; onDeleted?: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: () => honeyBatchesApi.delete(batch.id), onSuccess: async () => { queryClient.removeQueries({ queryKey: honeyBatchKeys.detail(batch.id) }); await queryClient.invalidateQueries({ queryKey: honeyBatchKeys.lists }); notify.success('Lote excluído com sucesso.'); onClose(); onDeleted?.() }, onError: (error) => notify.error(error instanceof Error ? error.message : 'Não foi possível excluir o lote.') })
  return <ConfirmDialog title="Excluir lote" description={`Excluir o lote ${batch.code}? Esta ação não pode ser desfeita.`} busy={mutation.isPending} onClose={onClose} onConfirm={() => mutation.mutate()} />
}

export function HoneyBatchListPage() {
  const [deleting, setDeleting] = useState<HoneyBatch>()
  const batches = useQuery({ queryKey: honeyBatchKeys.list(), queryFn: honeyBatchesApi.list })
  const cycles = useQuery({ queryKey: productionCycleKeys.list({}), queryFn: () => productionCyclesApi.list() })
  const findCycle = (id: string) => cycles.data?.find((cycle) => cycle.id === id)
  const columns = [
    { key: 'code', header: 'Lote', render: (batch: HoneyBatch) => <Link to={`/honey-batches/${batch.id}`}>{batch.code}</Link> },
    { key: 'cycle', header: 'Ciclo', render: (batch: HoneyBatch) => cycleLabel(findCycle(batch.productionCycleId)) },
    { key: 'stock', header: 'Estoque disponível / total', render: (batch: HoneyBatch) => <StockDisplay batch={batch} /> },
    { key: 'quality', header: 'Qualidade', render: (batch: HoneyBatch) => <Badge value={batch.quality} label={formatStatus(batch.quality)} /> },
    { key: 'status', header: 'Situação', render: (batch: HoneyBatch) => <Badge value={batch.status} label={formatStatus(batch.status)} /> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, render: (batch: HoneyBatch) => <div className="row-actions"><Link className="icon-button" to={`/honey-batches/${batch.id}`} aria-label={`Ver lote ${batch.code}`} title="Ver detalhes"><Eye size={17} /></Link><PermissionGuard permission="operations:write"><Link className="icon-button" to={`/honey-batches/${batch.id}/edit`} aria-label={`Editar lote ${batch.code}`} title="Editar"><Pencil size={17} /></Link><button className="icon-button danger-icon" onClick={() => setDeleting(batch)} aria-label={`Excluir lote ${batch.code}`} title="Excluir"><Trash2 size={17} /></button></PermissionGuard></div> },
  ]
  const pending = batches.isPending || cycles.isPending
  const error = batches.error ?? cycles.error
  return <TablePage title="Lotes de mel" description="Consulte a origem, qualidade e disponibilidade do estoque." actions={<PermissionGuard permission="operations:write"><Link className="button button--primary button-link" to="/honey-batches/new"><Plus size={17} /> Novo lote</Link></PermissionGuard>}>{pending ? <Spinner label="Carregando lotes" /> : error ? <ErrorState error={error} onRetry={() => { void batches.refetch(); void cycles.refetch() }} /> : batches.data.length === 0 ? <EmptyState title="Nenhum lote cadastrado" description="Cadastre o primeiro lote de mel produzido." /> : <Table caption="Lotes de mel" rows={batches.data} getRowKey={(batch) => batch.id} columns={columns} />}{deleting && <BatchDeleteDialog batch={deleting} onClose={() => setDeleting(undefined)} />}</TablePage>
}

export function HoneyBatchDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const batch = useQuery({ queryKey: honeyBatchKeys.detail(id), queryFn: () => honeyBatchesApi.get(id), enabled: Boolean(id) })
  const cycles = useQuery({ queryKey: productionCycleKeys.list({}), queryFn: () => productionCyclesApi.list() })
  if (batch.isPending || cycles.isPending) return <main className="page"><Spinner label="Carregando lote" /></main>
  const error = batch.error ?? cycles.error
  if (error) return <main className="page"><ErrorState error={error} onRetry={() => { void batch.refetch(); void cycles.refetch() }} /></main>
  const data = batch.data
  const sold = new Decimal(data.quantityKg).minus(data.availableQuantityKg)
  return <DetailPage title={data.code} description={`Produzido em ${formatDate(data.productionDate)}`} actions={<><Link className="button button--secondary button-link" to="/honey-batches">Voltar</Link><PermissionGuard permission="operations:write"><Link className="button button--primary button-link" to={`/honey-batches/${data.id}/edit`}><Pencil size={17} /> Editar</Link><Button variant="danger" onClick={() => setDeleting(true)}><Trash2 size={17} /> Excluir</Button></PermissionGuard></>}><ContentCard title="Estoque"><div className="stock-detail"><StockDisplay batch={data} /><dl className="detail-list"><div><dt>Quantidade total</dt><dd>{formatKilograms(data.quantityKg)}</dd></div><div><dt>Quantidade disponível</dt><dd>{formatKilograms(data.availableQuantityKg)}</dd></div><div><dt>Quantidade vendida</dt><dd>{formatKilograms(sold)}</dd></div></dl></div></ContentCard><ContentCard title="Origem e classificação"><dl className="detail-list"><div><dt>Ciclo de produção</dt><dd>{cycleLabel(cycles.data.find((cycle) => cycle.id === data.productionCycleId))}</dd></div><div><dt>Qualidade</dt><dd><Badge value={data.quality} label={formatStatus(data.quality)} /></dd></div><div><dt>Situação</dt><dd><Badge value={data.status} label={formatStatus(data.status)} /></dd></div></dl></ContentCard>{deleting && <BatchDeleteDialog batch={data} onClose={() => setDeleting(false)} onDeleted={() => navigate('/honey-batches')} />}</DetailPage>
}

function HoneyBatchEditor({ batch }: { batch?: HoneyBatch }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cycles = useQuery({ queryKey: productionCycleKeys.list({}), queryFn: () => productionCyclesApi.list() })
  const mutation = useMutation({ mutationFn: (values: HoneyBatchRequest) => batch ? honeyBatchesApi.update(batch.id, values) : honeyBatchesApi.create(values), onSuccess: async (saved) => { queryClient.setQueryData(honeyBatchKeys.detail(saved.id), saved); await queryClient.invalidateQueries({ queryKey: honeyBatchKeys.lists }); notify.success(batch ? 'Lote atualizado com sucesso.' : 'Lote criado com sucesso.'); navigate(`/honey-batches/${saved.id}`) } })
  if (cycles.isPending) return <main className="page"><Spinner label="Carregando ciclos" /></main>
  if (cycles.isError) return <main className="page"><ErrorState error={cycles.error} onRetry={() => cycles.refetch()} /></main>
  if (cycles.data.length === 0) return <main className="page"><EmptyState title="Cadastre um ciclo primeiro" description="Um lote precisa estar vinculado a um ciclo de produção." /></main>
  return <HoneyBatchForm batch={batch} cycles={cycles.data} busy={mutation.isPending} onSubmit={mutation.mutateAsync} onCancel={() => navigate(batch ? `/honey-batches/${batch.id}` : '/honey-batches')} />
}

export function HoneyBatchCreatePage() { return <HoneyBatchEditor /> }

export function HoneyBatchEditPage() {
  const { id = '' } = useParams()
  const batch = useQuery({ queryKey: honeyBatchKeys.detail(id), queryFn: () => honeyBatchesApi.get(id), enabled: Boolean(id) })
  if (batch.isPending) return <main className="page"><Spinner label="Carregando lote" /></main>
  if (batch.isError) return <main className="page"><ErrorState error={batch.error} onRetry={() => batch.refetch()} /></main>
  return <HoneyBatchEditor batch={batch.data} />
}