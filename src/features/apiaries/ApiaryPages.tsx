import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiariesApi, apiaryKeys } from '../../api/apiaries'
import type { Apiary, ApiaryRequest } from '../../api/types'
import { PermissionGuard } from '../../auth/PermissionGuard'
import { ContentCard, DetailPage, TablePage } from '../../components/PageLayouts'
import { notify } from '../../components/notifications'
import { Button, ConfirmDialog, EmptyState, ErrorState, Spinner, Table } from '../../components/ui'
import { formatDate } from '../../utils/format'
import { ApiaryForm } from './ApiaryForm'

function ApiaryDeleteDialog({ apiary, onClose, onDeleted }: { apiary: Apiary; onClose: () => void; onDeleted?: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => apiariesApi.delete(apiary.id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: apiaryKeys.detail(apiary.id) })
      await queryClient.invalidateQueries({ queryKey: apiaryKeys.all, exact: true })
      notify.success('Apiário excluído com sucesso.')
      onClose(); onDeleted?.()
    },
    onError: (error) => notify.error(error instanceof Error ? error.message : 'Não foi possível excluir o apiário.'),
  })
  return <ConfirmDialog title="Excluir apiário" description={`Excluir “${apiary.name}”? Esta ação não pode ser desfeita.`} busy={mutation.isPending} onClose={onClose} onConfirm={() => mutation.mutate()} />
}

export function ApiaryListPage() {
  const [deleting, setDeleting] = useState<Apiary>()
  const query = useQuery({ queryKey: apiaryKeys.all, queryFn: apiariesApi.list })
  const columns = [
    { key: 'name', header: 'Nome', render: (apiary: Apiary) => <Link to={`/apiaries/${apiary.id}`}>{apiary.name}</Link> },
    { key: 'location', header: 'Localização', render: (apiary: Apiary) => apiary.location },
    { key: 'coordinates', header: 'Coordenadas', render: (apiary: Apiary) => apiary.latitude && apiary.longitude ? `${apiary.latitude}, ${apiary.longitude}` : '—' },
    { key: 'actions', header: <span className="sr-only">Ações</span>, render: (apiary: Apiary) => <div className="row-actions"><Link className="icon-button" to={`/apiaries/${apiary.id}`} aria-label={`Ver ${apiary.name}`} title="Ver detalhes"><Eye size={17} /></Link><PermissionGuard permission="operations:write"><Link className="icon-button" to={`/apiaries/${apiary.id}/edit`} aria-label={`Editar ${apiary.name}`} title="Editar"><Pencil size={17} /></Link><button className="icon-button danger-icon" onClick={() => setDeleting(apiary)} aria-label={`Excluir ${apiary.name}`} title="Excluir"><Trash2 size={17} /></button></PermissionGuard></div> },
  ]
  return <TablePage title="Apiários" description="Gerencie os locais e coordenadas da operação." actions={<PermissionGuard permission="operations:write"><Link className="button button--primary button-link" to="/apiaries/new"><Plus size={17} /> Novo apiário</Link></PermissionGuard>}>{query.isPending ? <Spinner label="Carregando apiários" /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data.length === 0 ? <EmptyState title="Nenhum apiário cadastrado" description="Cadastre o primeiro local da sua operação." /> : <Table caption="Apiários" rows={query.data} getRowKey={(apiary) => apiary.id} columns={columns} />}{deleting && <ApiaryDeleteDialog apiary={deleting} onClose={() => setDeleting(undefined)} />}</TablePage>
}

export function ApiaryDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const query = useQuery({ queryKey: apiaryKeys.detail(id), queryFn: () => apiariesApi.get(id), enabled: Boolean(id) })
  if (query.isPending) return <main className="page"><Spinner label="Carregando apiário" /></main>
  if (query.isError) return <main className="page"><ErrorState error={query.error} onRetry={() => query.refetch()} /></main>
  const apiary = query.data
  return <DetailPage title={apiary.name} description={apiary.location} actions={<><Link className="button button--secondary button-link" to="/apiaries">Voltar</Link><PermissionGuard permission="operations:write"><Link className="button button--primary button-link" to={`/apiaries/${apiary.id}/edit`}><Pencil size={17} /> Editar</Link><Button variant="danger" onClick={() => setDeleting(true)}><Trash2 size={17} /> Excluir</Button></PermissionGuard></>}><ContentCard title="Informações"><dl className="detail-list"><div><dt>Localização</dt><dd>{apiary.location}</dd></div><div><dt>Coordenadas</dt><dd>{apiary.latitude && apiary.longitude ? `${apiary.latitude}, ${apiary.longitude}` : 'Não informadas'}</dd></div><div><dt>Descrição</dt><dd>{apiary.description || 'Sem descrição'}</dd></div></dl></ContentCard><ContentCard title="Registro"><dl className="detail-list"><div><dt>Criado em</dt><dd>{formatDate(apiary.createdAt)}</dd></div><div><dt>Atualizado em</dt><dd>{formatDate(apiary.updatedAt)}</dd></div></dl></ContentCard>{deleting && <ApiaryDeleteDialog apiary={apiary} onClose={() => setDeleting(false)} onDeleted={() => navigate('/apiaries')} />}</DetailPage>
}

function ApiaryEditor({ apiary }: { apiary?: Apiary }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (values: ApiaryRequest) => apiary ? apiariesApi.update(apiary.id, values) : apiariesApi.create(values),
    onSuccess: async (saved) => {
      queryClient.setQueryData(apiaryKeys.detail(saved.id), saved)
      await queryClient.invalidateQueries({ queryKey: apiaryKeys.all, exact: true })
      notify.success(apiary ? 'Apiário atualizado com sucesso.' : 'Apiário criado com sucesso.')
      navigate(`/apiaries/${saved.id}`)
    },
  })
  return <ApiaryForm apiary={apiary} busy={mutation.isPending} onSubmit={mutation.mutateAsync} onCancel={() => navigate(apiary ? `/apiaries/${apiary.id}` : '/apiaries')} />
}

export function ApiaryCreatePage() { return <ApiaryEditor /> }

export function ApiaryEditPage() {
  const { id = '' } = useParams()
  const query = useQuery({ queryKey: apiaryKeys.detail(id), queryFn: () => apiariesApi.get(id), enabled: Boolean(id) })
  if (query.isPending) return <main className="page"><Spinner label="Carregando apiário" /></main>
  if (query.isError) return <main className="page"><ErrorState error={query.error} onRetry={() => query.refetch()} /></main>
  return <ApiaryEditor apiary={query.data} />
}