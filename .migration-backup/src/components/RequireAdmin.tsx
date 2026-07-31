import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../hooks/useAdminAuth'

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate to="/admin/login" replace state={{ from: location }} />
    )
  }

  return <>{children}</>
}
