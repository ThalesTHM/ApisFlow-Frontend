import { useEffect, useEffectEvent, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, SESSION_KEY, setUnauthorizedHandler } from '../api/client'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../api/types'
import { AuthContext, type AuthContextValue } from './auth-context'

function readSession(): AuthResponse | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as AuthResponse | null }
  catch { localStorage.removeItem(SESSION_KEY); return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState(readSession)
  const [session, setSession] = useState<AuthResponse | null>(initialSession)
  const [status, setStatus] = useState<AuthContextValue['status']>(initialSession ? 'loading' : 'unauthenticated')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setStatus('unauthenticated')
    navigate('/login', { replace: true })
  }

  const expireSession = useEffectEvent(clearSession)

  useEffect(() => {
    setUnauthorizedHandler(expireSession)
    return () => setUnauthorizedHandler(undefined)
  }, [])

  const completeValidation = useEffectEvent((user: User) => {
    if (!initialSession) return
    const validatedSession = { ...initialSession, user }
    localStorage.setItem(SESSION_KEY, JSON.stringify(validatedSession))
    setSession(validatedSession)
    setStatus('authenticated')
  })

  const failValidation = useEffectEvent((error: unknown) => {
    setNotice(error instanceof Error ? error.message : 'Não foi possível validar sua sessão. Entre novamente.')
    clearSession()
  })

  useEffect(() => {
    if (!initialSession) return
    let active = true
    api.get<User>('/auth/me')
      .then((user) => { if (active) completeValidation(user) })
      .catch((error) => { if (active) failValidation(error) })
    return () => { active = false }
  }, [initialSession])

  const authenticate = async (path: string, values: LoginRequest | RegisterRequest) => {
    const result = await api.post<AuthResponse>(path, values)
    setNotice('')
    localStorage.setItem(SESSION_KEY, JSON.stringify(result))
    setSession(result)
    setStatus('authenticated')
    navigate('/', { replace: true })
  }

  const role = session?.user.role
  const value: AuthContextValue = {
    session,
    status,
    notice,
    login: (values) => authenticate('/auth/login', values),
    register: (values) => authenticate('/auth/register', values),
    logout: clearSession,
    canManage: role === 'ADMIN' || role === 'MANAGER',
    isAdmin: role === 'ADMIN',
    hasRole: (...roles) => Boolean(role && roles.includes(role)),
  }

  return <AuthContext value={value}>{children}</AuthContext>
}
