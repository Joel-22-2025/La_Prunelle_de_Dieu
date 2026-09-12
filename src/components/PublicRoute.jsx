// ===========================================================================
// PublicRoute : inverse de ProtectedRoute.
// Un utilisateur déjà connecté n'a pas besoin de revenir sur /login.
// ===========================================================================
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Loading from './Loading'

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <Loading />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}