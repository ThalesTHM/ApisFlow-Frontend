import { createContext } from 'react'
import type { AuthResponse, LoginRequest, RegisterRequest, UserRole } from '../api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  session: AuthResponse | null
  status: AuthStatus
  notice: string
  login: (values: LoginRequest) => Promise<void>
  register: (values: RegisterRequest) => Promise<void>
  logout: () => void
  canManage: boolean
  isAdmin: boolean
  hasRole: (...roles: UserRole[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)