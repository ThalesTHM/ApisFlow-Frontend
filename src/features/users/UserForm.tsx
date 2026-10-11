import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { CreateUserRequest, UpdateUserRequest, User } from '../../api/types'
import { ContentCard, FormPage } from '../../components/PageLayouts'
import { Button, Input, Select } from '../../components/ui'
import { formatStatus } from '../../utils/format'
import { createUserSchema, editUserSchema, toCreateUserRequest, toUpdateUserRequest, type UserFormValues } from './user-schema'

const roles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const

export function UserForm({ user, busy, onSubmit, onCancel }: { user?: User; busy: boolean; onSubmit: (values: CreateUserRequest | UpdateUserRequest) => Promise<unknown>; onCancel: () => void }) {
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(user ? editUserSchema : createUserSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '', password: '', role: user?.role ?? 'OPERATOR', isActive: String(user?.isActive ?? true) as 'true' | 'false' },
  })
  const submit = handleSubmit(async (values) => {
    try { setServerError(''); await onSubmit(user ? toUpdateUserRequest(values) : toCreateUserRequest(values)) }
    catch (error) { setServerError(error instanceof Error ? error.message : 'Não foi possível salvar o usuário.') }
  })
  return <FormPage title={user ? 'Editar usuário' : 'Novo usuário'} description="Gerencie o acesso deste usuário à cooperativa atual." onSubmit={submit} noValidate><ContentCard title="Dados do usuário"><div className="resource-form"><div className="resource-form-grid"><Input label="Nome" autoFocus error={errors.name?.message} {...register('name')} /><Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} /><Input label={user ? 'Nova senha (opcional)' : 'Senha'} type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} /><Select label="Perfil" options={roles.map((value) => ({ value, label: formatStatus(value) }))} error={errors.role?.message} {...register('role')} />{user && <Select label="Situação" options={[{ value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }]} error={errors.isActive?.message} {...register('isActive')} />}</div>{serverError && <p className="form-error form-pad" role="alert">{serverError}</p>}<footer className="form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />} Salvar usuário</Button></footer></div></ContentCard></FormPage>
}