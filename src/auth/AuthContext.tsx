import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, SESSION_KEY, setUnauthorizedHandler } from '../api/client'
import type { AuthResponse, LoginRequest, RegisterRequest } from '../api/types'
import { AuthContext, type AuthContextValue } from './auth-context'

function readSession(): AuthResponse | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as AuthResponse | null }
  catch { localStorage.removeItem(SESSION_KEY); return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthResponse | null>(readSession)
  const navigate = useNavigate()

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(undefined)
  })

  const authenticate = async (path: string, values: LoginRequest | RegisterRequest) => {
    const result = await api.post<AuthResponse>(path, values)
    localStorage.setItem(SESSION_KEY, JSON.stringify(result))
    setSession(result)
    navigate('/', { replace: true })
  }

  const role = session?.user.role
  const value: AuthContextValue = {
    session,
    login: (values) => authenticate('/auth/login', values),
    register: (values) => authenticate('/auth/register', values),
    logout,
    canManage: role === 'ADMIN' || role === 'MANAGER',
    isAdmin: role === 'ADMIN',
    hasRole: (...roles) => Boolean(role && roles.includes(role)),
  }

  return <AuthContext value={value}>{children}</AuthContext>
}
