import { zodResolver } from '@hookform/resolvers/zod'
import { Hexagon, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import type { LoginRequest, RegisterRequest } from '../api/types'
import { Button, Input } from '../components/ui'
import { emailSchema, passwordSchema, tenantSlugSchema } from '../validation/schemas'
import { useAuth } from './useAuth'

const loginSchema = z.object({ tenantSlug: tenantSlugSchema, email: emailSchema, password: z.string().min(1, 'Informe sua senha.') })
const registerSchema = z.object({ tenantName: z.string().min(2, 'Use pelo menos 2 caracteres.').max(100), tenantSlug: tenantSlugSchema, name: z.string().min(2, 'Use pelo menos 2 caracteres.').max(100), email: emailSchema, password: passwordSchema })

function LoginForm() {
  const { login, notice } = useAuth()
  const [apiError, setApiError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginRequest>({ resolver: zodResolver(loginSchema) })
  const submit = handleSubmit(async (values) => { try { setApiError(''); await login(values) } catch (error) { setApiError(error instanceof Error ? error.message : 'Não foi possível entrar.') } })
  return <form onSubmit={submit} noValidate><Input label="Organização" placeholder="minha-cooperativa" autoComplete="organization" error={errors.tenantSlug?.message} {...register('tenantSlug')} /><Input label="E-mail" type="email" placeholder="voce@cooperativa.com" autoComplete="email" error={errors.email?.message} {...register('email')} /><Input label="Senha" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />{(apiError || notice) && <p className="form-error" role="alert">{apiError || notice}</p>}<Button type="submit" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="spin" size={17} />} Entrar</Button></form>
}

function RegisterForm() {
  const { register: createAccount } = useAuth()
  const [apiError, setApiError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterRequest>({ resolver: zodResolver(registerSchema) })
  const submit = handleSubmit(async (values) => { try { setApiError(''); await createAccount(values) } catch (error) { setApiError(error instanceof Error ? error.message : 'Não foi possível criar a conta.') } })
  return <form onSubmit={submit} noValidate><div className="form-grid"><Input label="Cooperativa" error={errors.tenantName?.message} {...register('tenantName')} /><Input label="Identificador" placeholder="minha-cooperativa" error={errors.tenantSlug?.message} {...register('tenantSlug')} /></div><Input label="Seu nome" autoComplete="name" error={errors.name?.message} {...register('name')} /><Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} /><Input label="Senha" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />{apiError && <p className="form-error" role="alert">{apiError}</p>}<Button type="submit" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="spin" size={17} />} Criar cooperativa</Button></form>
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  return <main className="auth-page"><section className="auth-brand"><div className="brand-mark"><Hexagon size={30} strokeWidth={1.8} /><span>HM</span></div><div><p className="eyebrow">Gestão apícola</p><h1>Honey Manager</h1><p>Operações, rastreabilidade e vendas da sua cooperativa em um só lugar.</p></div><div className="comb-pattern" aria-hidden="true" /></section><section className="auth-panel"><div className="auth-box"><header><p className="eyebrow">Acesso seguro</p><h2>{mode === 'login' ? 'Bem-vindo de volta' : 'Comece sua operação'}</h2></header><div className="segmented" role="tablist"><Link role="tab" aria-selected={mode === 'login'} to="/login">Entrar</Link><Link role="tab" aria-selected={mode === 'register'} to="/register">Criar conta</Link></div>{mode === 'login' ? <LoginForm /> : <RegisterForm />}</div></section></main>
}

export function LoginPage() { return <AuthPage mode="login" /> }
export function RegisterPage() { return <AuthPage mode="register" /> }