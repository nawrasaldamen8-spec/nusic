import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch, configureApiClient } from '../../shared/api/client'
import type { LoginRequest, LoginResponse } from '../../shared/types/api'

const STORAGE_KEY = 'nusic_auth'

interface AuthState {
  token: string
  username: string
  expiresAt: string
}

interface AuthContextValue {
  isAuthenticated: boolean
  username: string | null
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStoredAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthState
    if (!parsed.token || !parsed.expiresAt) return null
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const stored = loadStoredAuth()
    configureApiClient(stored?.token ?? null, () => {
      localStorage.removeItem(STORAGE_KEY)
    })
    return stored
  })

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }, [])

  useEffect(() => {
    configureApiClient(auth?.token ?? null, logout)
  }, [auth, logout])

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    const nextAuth: AuthState = {
      token: response.token,
      username: response.username,
      expiresAt: response.expiresAt,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth))
    configureApiClient(nextAuth.token, logout)
    setAuth(nextAuth)
  }, [logout])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: auth !== null,
        username: auth?.username ?? null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
