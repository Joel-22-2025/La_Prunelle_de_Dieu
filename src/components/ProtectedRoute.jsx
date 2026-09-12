// ===========================================================================
// ProtectedRoute : protège une route pour les utilisateurs connectés.
// - En cours de résolution d'auth => écran de chargement.
// - Non connecté => redirection vers /login.
// ===========================================================================
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Loading from './Loading'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <Loading />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}