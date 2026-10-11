import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiariesApi, apiaryKeys } from '../../api/apiaries'
import { hivesApi, hiveKeys, type HiveFilters } from '../../api/hives'
import type { ColonyStatus, Hive, HiveRequest } from '../../api/types'
import { PermissionGuard } from '../../auth/PermissionGuard'
import { ContentCard, DetailPage, TablePage } from '../../components/PageLayouts'
import { notify } from '../../components/notifications'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Select, Spinner, Table } from '../../components/ui'
import { formatDate, formatStatus } from '../../utils/format'
import { HiveForm } from './HiveForm'

const colonyStatuses: ColonyStatus[] = ['STRONG', 'MODERATE', 'WEAK', 'INACTIVE']

function HiveDeleteDialog({ hive, onClose, onDeleted }: { hive: Hive; onClose: () => void; onDeleted?: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: () => hivesApi.delete(hive.id), onSuccess: async () => { queryClient.removeQueries({ queryKey: hiveKeys.detail(hive.id) }); await queryClient.invalidateQueries({ queryKey: hiveKeys.lists }); notify.success('Colmeia excluída com sucesso.'); onClose(); onDeleted?.() }, onError: (error) => notify.error(error instanceof Error ? error.message : 'Não foi possível excluir a colmeia.') })
  return <ConfirmDialog title="Excluir colmeia" description={`Excluir “${hive.code}”? Esta ação não pode ser desfeita.`} busy={mutation.isPending} onClose={onClose} onConfirm={() => mutation.mutate()} />
}

export function HiveListPage() {
  const [filters, setFilters] = useState<HiveFilters>({})
  const [deleting, setDeleting] = useState<Hive>()
  const apiaries = useQuery({ queryKey: apiaryKeys.all, queryFn: apiariesApi.list })
  const hives = useQuery({ queryKey: hiveKeys.list(filters), queryFn: () => hivesApi.list(filters) })
  const apiaryName = (id: string) => apiaries.data?.find((apiary) => apiary.id === id)?.name ?? 'Apiário não encontrado'
  const columns = [
    { key: 'code', header: 'Código', render: (hive: Hive) => <Link to={`/hives/${hive.id}`}>{hive.code}</Link> },
    { key: 'apiary', header: 'Apiário', render: (hive: Hive) => apiaryName(hive.apiaryId) },
    { key: 'queen', header: 'Rainha', render: (hive: Hive) => <Badge value={hive.queenStatus} label={formatStatus(hive.queenStatus)} /> },
    { key: 'colony', header: 'Colônia', render: (hive: Hive) => <Badge value={hive.colonyStatus} label={formatStatus(hive.colonyStatus)} /> },
    { key: 'installation', header: 'Instalação', render: (hive: Hive) => formatDate(hive.installationDate) },
    { key: 'actions', header: <span className="sr-only">Ações</span>, render: (hive: Hive) => <div className="row-actions"><Link className="icon-button" to={`/hives/${hive.id}`} aria-label={`Ver ${hive.code}`} title="Ver detalhes"><Eye size={17} /></Link><PermissionGuard permission="operations:write"><Link className="icon-button" to={`/hives/${hive.id}/edit`} aria-label={`Editar ${hive.code}`} title="Editar"><Pencil size={17} /></Link><button className="icon-button danger-icon" onClick={() => setDeleting(hive)} aria-label={`Excluir ${hive.code}`} title="Excluir"><Trash2 size={17} /></button></PermissionGuard></div> },
  ]
  const pending = apiaries.isPending || hives.isPending
  const error = apiaries.error ?? hives.error
  return <TablePage title="Colmeias" description="Acompanhe as colmeias por apiário e condição da colônia." actions={<PermissionGuard permission="operations:write"><Link className="button button--primary button-link" to="/hives/new"><Plus size={17} /> Nova colmeia</Link></PermissionGuard>}><div className="filter-bar"><Select label="Apiário" placeholder="Todos os apiários" value={filters.apiaryId ?? ''} onChange={(event) => setFilters((current) => ({ ...current, apiaryId: event.target.value || undefined }))} options={(apiaries.data ?? []).map((apiary) => ({ value: apiary.id, label: apiary.name }))} /><Select label="Situação da colônia" placeholder="Todas as situações" value={filters.status ?? ''} onChange={(event) => setFilters((current) => ({ ...current, status: (event.target.value || undefined) as ColonyStatus | undefined }))} options={colonyStatuses.map((status) => ({ value: status, label: formatStatus(status) }))} /></div>{pending ? <Spinner label="Carregando colmeias" /> : error ? <ErrorState error={error} onRetry={() => { void apiaries.refetch(); void hives.refetch() }} /> : hives.data.length === 0 ? <EmptyState title="Nenhuma colmeia encontrada" description={filters.apiaryId || filters.status ? 'Ajuste os filtros para consultar outras colmeias.' : 'Cadastre a primeira colmeia da operação.'} /> : <Table caption="Colmeias" rows={hives.data} getRowKey={(hive) => hive.id} columns={columns} />}{deleting && <HiveDeleteDialog hive={deleting} onClose={() => setDeleting(undefined)} />}</TablePage>
}

export function HiveDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const hive = useQuery({ queryKey: hiveKeys.detail(id), queryFn: () => hivesApi.get(id), enabled: Boolean(id) })
  const apiaries = useQuery({ queryKey: apiaryKeys.all, queryFn: apiariesApi.list })
  if (hive.isPending || apiaries.isPending) return <main className="page"><Spinner label="Carregando colmeia" /></main>
  const error = hive.error ?? apiaries.error
  if (error) return <main className="page"><ErrorState error={error} onRetry={() => { void hive.refetch(); void apiaries.refetch() }} /></main>
  const data = hive.data
  const apiaryName = apiaries.data.find((apiary) => apiary.id === data.apiaryId)?.name ?? 'Apiário não encontrado'
  return <DetailPage title={data.code} description={apiaryName} actions={<><Link className="button button--secondary button-link" to="/hives">Voltar</Link><PermissionGuard permission="operations:write"><Link className="button button--primary button-link" to={`/hives/${data.id}/edit`}><Pencil size={17} /> Editar</Link><Button variant="danger" onClick={() => setDeleting(true)}><Trash2 size={17} /> Excluir</Button></PermissionGuard></>}><ContentCard title="Condição"><dl className="detail-list"><div><dt>Apiário</dt><dd>{apiaryName}</dd></div><div><dt>Rainha</dt><dd><Badge value={data.queenStatus} label={formatStatus(data.queenStatus)} /></dd></div><div><dt>Colônia</dt><dd><Badge value={data.colonyStatus} label={formatStatus(data.colonyStatus)} /></dd></div><div><dt>Instalada em</dt><dd>{formatDate(data.installationDate)}</dd></div><div><dt>Observações</dt><dd>{data.notes || 'Sem observações'}</dd></div></dl></ContentCard><ContentCard title="Registro"><dl className="detail-list"><div><dt>Criado em</dt><dd>{formatDate(data.createdAt)}</dd></div><div><dt>Atualizado em</dt><dd>{formatDate(data.updatedAt)}</dd></div></dl></ContentCard>{deleting && <HiveDeleteDialog hive={data} onClose={() => setDeleting(false)} onDeleted={() => navigate('/hives')} />}</DetailPage>
}

function HiveEditor({ hive }: { hive?: Hive }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const apiaries = useQuery({ queryKey: apiaryKeys.all, queryFn: apiariesApi.list })
  const mutation = useMutation({ mutationFn: (values: HiveRequest) => hive ? hivesApi.update(hive.id, values) : hivesApi.create(values), onSuccess: async (saved) => { queryClient.setQueryData(hiveKeys.detail(saved.id), saved); await queryClient.invalidateQueries({ queryKey: hiveKeys.lists }); notify.success(hive ? 'Colmeia atualizada com sucesso.' : 'Colmeia criada com sucesso.'); navigate(`/hives/${saved.id}`) } })
  if (apiaries.isPending) return <main className="page"><Spinner label="Carregando apiários" /></main>
  if (apiaries.isError) return <main className="page"><ErrorState error={apiaries.error} onRetry={() => apiaries.refetch()} /></main>
  if (apiaries.data.length === 0) return <main className="page"><EmptyState title="Cadastre um apiário primeiro" description="Uma colmeia precisa estar vinculada a um apiário." /></main>
  return <HiveForm hive={hive} apiaries={apiaries.data} busy={mutation.isPending} onSubmit={mutation.mutateAsync} onCancel={() => navigate(hive ? `/hives/${hive.id}` : '/hives')} />
}

export function HiveCreatePage() { return <HiveEditor /> }

export function HiveEditPage() {
  const { id = '' } = useParams()
  const hive = useQuery({ queryKey: hiveKeys.detail(id), queryFn: () => hivesApi.get(id), enabled: Boolean(id) })
  if (hive.isPending) return <main className="page"><Spinner label="Carregando colmeia" /></main>
  if (hive.isError) return <main className="page"><ErrorState error={hive.error} onRetry={() => hive.refetch()} /></main>
  return <HiveEditor hive={hive.data} />
}