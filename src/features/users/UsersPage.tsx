import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import type { User } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { CrudPage } from '../../components/CrudPage'
import { Badge } from '../../components/ui'

const schema = (editing: boolean) => z.object({ name: z.string().min(2, 'Informe ao menos 2 caracteres.').max(100), email: z.email('Informe um e-mail válido.').max(254), password: editing ? z.string().max(72).refine((value) => value === '' || value.length >= 8, 'Use ao menos 8 caracteres.') : z.string().min(8, 'Use ao menos 8 caracteres.').max(72), role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR']), isActive: z.boolean().optional() })

export function UsersPage() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return <CrudPage<User> title="Usuários" subtitle="Acessos e responsabilidades da equipe." singular="Usuário" endpoint="/users" queryKey="users" canManage schema={schema} fields={[{ name: 'name', label: 'Nome' }, { name: 'email', label: 'E-mail', type: 'email' }, { name: 'password', label: 'Senha', type: 'password', placeholder: 'Deixe vazio para manter a atual' }, { name: 'role', label: 'Perfil', type: 'select', options: [{ value: 'ADMIN', label: 'Administrador' }, { value: 'MANAGER', label: 'Gestor' }, { value: 'OPERATOR', label: 'Operador' }] }, { name: 'isActive', label: 'Usuário ativo', type: 'checkbox', hiddenOnCreate: true }]} columns={[{ label: 'Nome', render: (user) => <strong>{user.name}</strong> }, { label: 'E-mail', render: (user) => user.email }, { label: 'Perfil', render: (user) => <Badge value={user.role} /> }, { label: 'Situação', render: (user) => <Badge value={user.isActive ? 'ACTIVE' : 'INACTIVE'} /> }]} initialValues={(user) => ({ name: user?.name, email: user?.email, password: '', role: user?.role ?? 'OPERATOR', isActive: user?.isActive ?? true })} toPayload={(values) => { if (!values.password) delete values.password; return values }} />
}