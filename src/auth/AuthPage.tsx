import { zodResolver } from '@hookform/resolvers/zod'
import { Hexagon, LoaderCircle } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { LoginRequest, RegisterRequest } from '../api/types'
import { Button } from '../components/ui'
import { useAuth } from './useAuth'

const slug = z.string().min(2, 'Use pelo menos 2 caracteres.').max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use letras minúsculas, números e hífens.')
const loginSchema = z.object({ tenantSlug: slug, email: z.email('Informe um e-mail válido.'), password: z.string().min(1, 'Informe sua senha.') })
const registerSchema = z.object({ tenantName: z.string().min(2, 'Use pelo menos 2 caracteres.').max(100), tenantSlug: slug, name: z.string().min(2, 'Use pelo menos 2 caracteres.').max(100), email: z.email('Informe um e-mail válido.').max(254), password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(72) })

function Field({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return <label className="field"><span>{label}</span><input {...props} aria-invalid={Boolean(error)} />{error && <small role="alert">{error}</small>}</label>
}

function LoginForm() {
  const { login } = useAuth()
  const [apiError, setApiError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginRequest>({ resolver: zodResolver(loginSchema) })
  const submit = handleSubmit(async (values) => { try { setApiError(''); await login(values) } catch (error) { setApiError(error instanceof Error ? error.message : 'Não foi possível entrar.') } })
  return <form onSubmit={submit} noValidate><Field label="Organização" placeholder="minha-cooperativa" autoComplete="organization" error={errors.tenantSlug?.message} {...register('tenantSlug')} /><Field label="E-mail" type="email" placeholder="voce@cooperativa.com" autoComplete="email" error={errors.email?.message} {...register('email')} /><Field label="Senha" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />{apiError && <p className="form-error" role="alert">{apiError}</p>}<Button type="submit" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="spin" size={17} />} Entrar</Button></form>
}

function RegisterForm() {
  const { register: createAccount } = useAuth()
  const [apiError, setApiError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterRequest>({ resolver: zodResolver(registerSchema) })
  const submit = handleSubmit(async (values) => { try { setApiError(''); await createAccount(values) } catch (error) { setApiError(error instanceof Error ? error.message : 'Não foi possível criar a conta.') } })
  return <form onSubmit={submit} noValidate><div className="form-grid"><Field label="Cooperativa" error={errors.tenantName?.message} {...register('tenantName')} /><Field label="Identificador" placeholder="minha-cooperativa" error={errors.tenantSlug?.message} {...register('tenantSlug')} /></div><Field label="Seu nome" autoComplete="name" error={errors.name?.message} {...register('name')} /><Field label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} /><Field label="Senha" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />{apiError && <p className="form-error" role="alert">{apiError}</p>}<Button type="submit" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="spin" size={17} />} Criar cooperativa</Button></form>
}

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  return <main className="auth-page"><section className="auth-brand"><div className="brand-mark"><Hexagon size={30} strokeWidth={1.8} /><span>HM</span></div><div><p className="eyebrow">Gestão apícola</p><h1>Honey Manager</h1><p>Operações, rastreabilidade e vendas da sua cooperativa em um só lugar.</p></div><div className="comb-pattern" aria-hidden="true" /></section><section className="auth-panel"><div className="auth-box"><header><p className="eyebrow">Acesso seguro</p><h2>{mode === 'login' ? 'Bem-vindo de volta' : 'Comece sua operação'}</h2></header><div className="segmented" role="tablist"><button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}>Entrar</button><button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => setMode('register')}>Criar conta</button></div>{mode === 'login' ? <LoginForm /> : <RegisterForm />}</div></section></main>
}