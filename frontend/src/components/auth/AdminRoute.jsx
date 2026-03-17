import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user || (user.role || 'user') !== 'admin') {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return children
}

