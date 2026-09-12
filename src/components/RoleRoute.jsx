// ===========================================================================
// RoleRoute : protège une route selon le rôle ("admin" ou "pharmacien").
// - Non connecté          => /login.
// - Rôle différent (ou profil absent) => /dashboard.
// ===========================================================================
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Loading from './Loading'

export default function RoleRoute({ role, children }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <Loading />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile || profile.role !== role) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}