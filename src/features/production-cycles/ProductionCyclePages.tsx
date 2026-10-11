import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { hivesApi, hiveKeys } from '../../api/hives'
import { productionCyclesApi, productionCycleKeys, type ProductionCycleFilters } from '../../api/production-cycles'
import type { ProductionCycle, ProductionCycleRequest, ProductionCycleStatus } from '../../api/types'
import { PermissionGuard } from '../../auth/PermissionGuard'
import { ContentCard, DetailPage, TablePage } from '../../components/PageLayouts'
import { notify } from '../../components/notifications'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Select, Spinner, Table } from '../../components/ui'
import { formatDate, formatKilograms, formatStatus } from '../../utils/format'
import { ProductionCycleForm } from './ProductionCycleForm'

const statuses: ProductionCycleStatus[] = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']

function CycleDeleteDialog({ cycle, onClose, onDeleted }: { cycle: ProductionCycle; onClose: () => void; onDeleted?: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: () => productionCyclesApi.delete(cycle.id), onSuccess: async () => { queryClient.removeQueries({ queryKey: productionCycleKeys.detail(cycle.id) }); await queryClient.invalidateQueries({ queryKey: productionCycleKeys.lists }); notify.success('Ciclo excluído com sucesso.'); onClose(); onDeleted?.() }, onError: (error) => notify.error(error instanceof Error ? error.message : 'Não foi possível excluir o ciclo.') })
  return <ConfirmDialog title="Excluir ciclo" description="Excluir este ciclo de produção? Esta ação não pode ser desfeita." busy={mutation.isPending} onClose={onClose} onConfirm={() => mutation.mutate()} />
}

export function ProductionCycleListPage() {
  const [filters, setFilters] = useState<ProductionCycleFilters>({})
  const [deleting, setDeleting] = useState<ProductionCycle>()
  const hives = useQuery({ queryKey: hiveKeys.list({}), queryFn: () => hivesApi.list() })
  const cycles = useQuery({ queryKey: productionCycleKeys.list(filters), queryFn: () => productionCyclesApi.list(filters) })
  const hiveCode = (id: string) => hives.data?.find((hive) => hive.id === id)?.code ?? 'Colmeia não encontrada'
  const columns = [
    { key: 'hive', header: 'Colmeia', render: (cycle: ProductionCycle) => <Link to={`/production-cycles/${cycle.id}`}>{hiveCode(cycle.hiveId)}</Link> },
    { key: 'status', header: 'Situação', render: (cycle: ProductionCycle) => <Badge value={cycle.status} label={formatStatus(cycle.status)} /> },
    { key: 'period', header: 'Período', render: (cycle: ProductionCycle) => `${formatDate(cycle.startDate)} — ${formatDate(cycle.endDate)}` },
    { key: 'estimated', header: 'Estimada', render: (cycle: ProductionCycle) => formatKilograms(cycle.estimatedProductionKg) },
    { key: 'actual', header: 'Real', render: (cycle: ProductionCycle) => formatKilograms(cycle.actualProductionKg) },
    { key: 'actions', header: <span className="sr-only">Ações</span>, render: (cycle: ProductionCycle) => <div className="row-actions"><Link className="icon-button" to={`/production-cycles/${cycle.id}`} aria-label={`Ver ciclo de ${hiveCode(cycle.hiveId)}`} title="Ver detalhes"><Eye size={17} /></Link><PermissionGuard permission="operations:write"><Link className="icon-button" to={`/production-cycles/${cycle.id}/edit`} aria-label={`Editar ciclo de ${hiveCode(cycle.hiveId)}`} title="Editar"><Pencil size={17} /></Link><button className="icon-button danger-icon" onClick={() => setDeleting(cycle)} aria-label={`Excluir ciclo de ${hiveCode(cycle.hiveId)}`} title="Excluir"><Trash2 size={17} /></button></PermissionGuard></div> },
  ]
  const pending = hives.isPending || cycles.isPending
  const error = hives.error ?? cycles.error
  return <TablePage title="Ciclos de produção" description="Planeje e acompanhe a produção de cada colmeia." actions={<PermissionGuard permission="operations:write"><Link className="button button--primary button-link" to="/production-cycles/new"><Plus size={17} /> Novo ciclo</Link></PermissionGuard>}><div className="filter-bar"><Select label="Colmeia" placeholder="Todas as colmeias" value={filters.hiveId ?? ''} onChange={(event) => setFilters((current) => ({ ...current, hiveId: event.target.value || undefined }))} options={(hives.data ?? []).map((hive) => ({ value: hive.id, label: hive.code }))} /><Select label="Situação" placeholder="Todas as situações" value={filters.status ?? ''} onChange={(event) => setFilters((current) => ({ ...current, status: (event.target.value || undefined) as ProductionCycleStatus | undefined }))} options={statuses.map((status) => ({ value: status, label: formatStatus(status) }))} /></div>{pending ? <Spinner label="Carregando ciclos" /> : error ? <ErrorState error={error} onRetry={() => { void hives.refetch(); void cycles.refetch() }} /> : cycles.data.length === 0 ? <EmptyState title="Nenhum ciclo encontrado" description={filters.hiveId || filters.status ? 'Ajuste os filtros para consultar outros ciclos.' : 'Cadastre o primeiro ciclo de produção.'} /> : <Table caption="Ciclos de produção" rows={cycles.data} getRowKey={(cycle) => cycle.id} columns={columns} />}{deleting && <CycleDeleteDialog cycle={deleting} onClose={() => setDeleting(undefined)} />}</TablePage>
}

export function ProductionCycleDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const cycle = useQuery({ queryKey: productionCycleKeys.detail(id), queryFn: () => productionCyclesApi.get(id), enabled: Boolean(id) })
  const hives = useQuery({ queryKey: hiveKeys.list({}), queryFn: () => hivesApi.list() })
  if (cycle.isPending || hives.isPending) return <main className="page"><Spinner label="Carregando ciclo" /></main>
  const error = cycle.error ?? hives.error
  if (error) return <main className="page"><ErrorState error={error} onRetry={() => { void cycle.refetch(); void hives.refetch() }} /></main>
  const data = cycle.data
  const hiveCode = hives.data.find((hive) => hive.id === data.hiveId)?.code ?? 'Colmeia não encontrada'
  return <DetailPage title={`Ciclo de ${hiveCode}`} description={`${formatDate(data.startDate)} — ${formatDate(data.endDate)}`} actions={<><Link className="button button--secondary button-link" to="/production-cycles">Voltar</Link><PermissionGuard permission="operations:write"><Link className="button button--primary button-link" to={`/production-cycles/${data.id}/edit`}><Pencil size={17} /> Editar</Link><Button variant="danger" onClick={() => setDeleting(true)}><Trash2 size={17} /> Excluir</Button></PermissionGuard></>}><ContentCard title="Produção"><dl className="detail-list"><div><dt>Situação</dt><dd><Badge value={data.status} label={formatStatus(data.status)} /></dd></div><div><dt>Colmeia</dt><dd>{hiveCode}</dd></div><div><dt>Produção estimada</dt><dd>{formatKilograms(data.estimatedProductionKg)}</dd></div><div><dt>Produção real</dt><dd>{formatKilograms(data.actualProductionKg)}</dd></div><div><dt>Observações</dt><dd>{data.notes || 'Sem observações'}</dd></div></dl></ContentCard>{deleting && <CycleDeleteDialog cycle={data} onClose={() => setDeleting(false)} onDeleted={() => navigate('/production-cycles')} />}</DetailPage>
}

function ProductionCycleEditor({ cycle }: { cycle?: ProductionCycle }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const hives = useQuery({ queryKey: hiveKeys.list({}), queryFn: () => hivesApi.list() })
  const mutation = useMutation({ mutationFn: (values: ProductionCycleRequest) => cycle ? productionCyclesApi.update(cycle.id, values) : productionCyclesApi.create(values), onSuccess: async (saved) => { queryClient.setQueryData(productionCycleKeys.detail(saved.id), saved); await queryClient.invalidateQueries({ queryKey: productionCycleKeys.lists }); notify.success(cycle ? 'Ciclo atualizado com sucesso.' : 'Ciclo criado com sucesso.'); navigate(`/production-cycles/${saved.id}`) } })
  if (hives.isPending) return <main className="page"><Spinner label="Carregando colmeias" /></main>
  if (hives.isError) return <main className="page"><ErrorState error={hives.error} onRetry={() => hives.refetch()} /></main>
  if (hives.data.length === 0) return <main className="page"><EmptyState title="Cadastre uma colmeia primeiro" description="Um ciclo precisa estar vinculado a uma colmeia." /></main>
  return <ProductionCycleForm cycle={cycle} hives={hives.data} busy={mutation.isPending} onSubmit={mutation.mutateAsync} onCancel={() => navigate(cycle ? `/production-cycles/${cycle.id}` : '/production-cycles')} />
}

export function ProductionCycleCreatePage() { return <ProductionCycleEditor /> }

export function ProductionCycleEditPage() {
  const { id = '' } = useParams()
  const cycle = useQuery({ queryKey: productionCycleKeys.detail(id), queryFn: () => productionCyclesApi.get(id), enabled: Boolean(id) })
  if (cycle.isPending) return <main className="page"><Spinner label="Carregando ciclo" /></main>
  if (cycle.isError) return <main className="page"><ErrorState error={cycle.error} onRetry={() => cycle.refetch()} /></main>
  return <ProductionCycleEditor cycle={cycle.data} />
}