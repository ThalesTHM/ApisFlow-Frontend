import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { CreateUserRequest, UpdateUserRequest, User } from '../../api/types'
import { userKeys, usersApi } from '../../api/users'
import { PermissionGuard } from '../../auth/PermissionGuard'
import { ContentCard, DetailPage, TablePage } from '../../components/PageLayouts'
import { notify } from '../../components/notifications'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Spinner, Table, TableSkeleton } from '../../components/ui'
import { formatDate, formatStatus } from '../../utils/format'
import { UserForm } from './UserForm'

function UserDeleteDialog({ user, onClose, onDeleted }: { user: User; onClose: () => void; onDeleted?: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => usersApi.delete(user.id),
    onSuccess: async () => { queryClient.removeQueries({ queryKey: userKeys.detail(user.id) }); await queryClient.invalidateQueries({ queryKey: userKeys.all, exact: true }); notify.success('Usuário excluído com sucesso.'); onClose(); onDeleted?.() },
    onError: (error) => notify.error(error instanceof Error ? error.message : 'Não foi possível excluir o usuário.'),
  })
  return <ConfirmDialog title="Excluir usuário" description={`Excluir “${user.name}”? Esta ação não pode ser desfeita.`} busy={mutation.isPending} onClose={onClose} onConfirm={() => mutation.mutate()} />
}

export function UserListPage() {
  const [deleting, setDeleting] = useState<User>()
  const query = useQuery({ queryKey: userKeys.all, queryFn: usersApi.list })
  const columns = [
    { key: 'name', header: 'Nome', render: (user: User) => <Link to={`/users/${user.id}`}>{user.name}</Link> },
    { key: 'email', header: 'E-mail', render: (user: User) => user.email },
    { key: 'role', header: 'Perfil', render: (user: User) => <Badge value={user.role} label={formatStatus(user.role)} /> },
    { key: 'status', header: 'Situação', render: (user: User) => <Badge value={user.isActive ? 'ACTIVE' : 'INACTIVE'} label={user.isActive ? 'Ativo' : 'Inativo'} /> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, render: (user: User) => <div className="row-actions"><Link className="icon-button" to={`/users/${user.id}`} aria-label={`Ver ${user.name}`} title="Ver detalhes"><Eye size={17} /></Link><PermissionGuard permission="users:write"><Link className="icon-button" to={`/users/${user.id}/edit`} aria-label={`Editar ${user.name}`} title="Editar"><Pencil size={17} /></Link><button className="icon-button danger-icon" onClick={() => setDeleting(user)} aria-label={`Excluir ${user.name}`} title="Excluir"><Trash2 size={17} /></button></PermissionGuard></div> },
  ]
  return <TablePage title="Usuários" description="Gerencie as pessoas e permissões da cooperativa." actions={<PermissionGuard permission="users:write"><Link className="button button--primary button-link" to="/users/new"><Plus size={17} /> Novo usuário</Link></PermissionGuard>}>{query.isPending ? <TableSkeleton label="Carregando usuários" columns={5} /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data.length === 0 ? <EmptyState title="Nenhum usuário cadastrado" description="Cadastre a primeira pessoa da cooperativa." /> : <Table caption="Usuários" rows={query.data} getRowKey={(user) => user.id} columns={columns} />}{deleting && <UserDeleteDialog user={deleting} onClose={() => setDeleting(undefined)} />}</TablePage>
}

export function UserDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const query = useQuery({ queryKey: userKeys.detail(id), queryFn: () => usersApi.get(id), enabled: Boolean(id) })
  if (query.isPending) return <main className="page"><Spinner label="Carregando usuário" /></main>
  if (query.isError) return <main className="page"><ErrorState error={query.error} onRetry={() => query.refetch()} /></main>
  const user = query.data
  return <DetailPage title={user.name} description={user.email} actions={<><Link className="button button--secondary button-link" to="/users">Voltar</Link><PermissionGuard permission="users:write"><Link className="button button--primary button-link" to={`/users/${user.id}/edit`}><Pencil size={17} /> Editar</Link><Button variant="danger" onClick={() => setDeleting(true)}><Trash2 size={17} /> Excluir</Button></PermissionGuard></>}><ContentCard title="Acesso"><dl className="detail-list"><div><dt>Perfil</dt><dd><Badge value={user.role} label={formatStatus(user.role)} /></dd></div><div><dt>Situação</dt><dd><Badge value={user.isActive ? 'ACTIVE' : 'INACTIVE'} label={user.isActive ? 'Ativo' : 'Inativo'} /></dd></div></dl></ContentCard><ContentCard title="Registro"><dl className="detail-list"><div><dt>Criado em</dt><dd>{formatDate(user.createdAt)}</dd></div><div><dt>Atualizado em</dt><dd>{formatDate(user.updatedAt)}</dd></div></dl></ContentCard>{deleting && <UserDeleteDialog user={user} onClose={() => setDeleting(false)} onDeleted={() => navigate('/users')} />}</DetailPage>
}

function UserEditor({ user }: { user?: User }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (values: CreateUserRequest | UpdateUserRequest) => user ? usersApi.update(user.id, values as UpdateUserRequest) : usersApi.create(values as CreateUserRequest),
    onSuccess: async (saved) => { queryClient.setQueryData(userKeys.detail(saved.id), saved); await queryClient.invalidateQueries({ queryKey: userKeys.all, exact: true }); notify.success(user ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.'); navigate(`/users/${saved.id}`) },
  })
  return <UserForm user={user} busy={mutation.isPending} onSubmit={mutation.mutateAsync} onCancel={() => navigate(user ? `/users/${user.id}` : '/users')} />
}

export function UserCreatePage() { return <UserEditor /> }

export function UserEditPage() {
  const { id = '' } = useParams()
  const query = useQuery({ queryKey: userKeys.detail(id), queryFn: () => usersApi.get(id), enabled: Boolean(id) })
  if (query.isPending) return <main className="page"><Spinner label="Carregando usuário" /></main>
  if (query.isError) return <main className="page"><ErrorState error={query.error} onRetry={() => query.refetch()} /></main>
  return <UserEditor user={query.data} />
}