import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AdminAuthContext,
  type AdminAuthContextValue,
} from './adminAuthContext'

const STORAGE_KEY = 'ukul_admin_token'

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      if (token) sessionStorage.setItem(STORAGE_KEY, token)
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [token])

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      token?: string
      error?: string
    }
    if (!res.ok) {
      throw new Error(data.error ?? '로그인에 실패했습니다.')
    }
    const t = data.token
    if (!t) throw new Error('토큰이 없습니다.')
    setToken(t)
  }, [])

  const logout = useCallback(() => setToken(null), [])

  const value = useMemo(
    (): AdminAuthContextValue => ({
      token,
      isAuthenticated: Boolean(token && token.length > 0),
      login,
      logout,
    }),
    [token, login, logout],
  )

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}
