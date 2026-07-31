import { createContext } from 'react'

export type AdminAuthContextValue = {
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)
