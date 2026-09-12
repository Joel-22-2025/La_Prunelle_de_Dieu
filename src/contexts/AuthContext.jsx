// ===========================================================================
// Contexte d'authentification
// ---------------------------------------------------------------------------
// Expose à toute l'application : user, profile (avec le rôle), loading,
// login et logout. Écoute en temps réel l'état d'authentification Firebase
// ET le profil Firestore de l'utilisateur connecté.
//
// Un compte désactivé (actif: false) est automatiquement déconnecté : c'est
// la protection qui s'applique à un pharmacien déjà connecté.
// ===========================================================================
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import * as authService from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // "user"    : utilisateur Firebase Auth courant (ou null).
  // "profile" : document Firestore "users/{uid}" (rôle, actif, nom...).
  // "loading" : vrai tant que l'état d'authentification n'est pas résolu.
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // -------------------------------------------------------------------------
  // Écoute l'état d'authentification Firebase.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  // -------------------------------------------------------------------------
  // Abonne-nous au profil Firestore de l'utilisateur connecté.
  // Le snapshot permet de réagir immédiatement à une désactivation.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return undefined
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (!snapshot.exists()) {
        // Pas de document "users" => pas de rôle défini => accès refusé.
        setProfile(null)
        return
      }

      const data = snapshot.data()

      // Compte désactivé en cours de session => déconnexion immédiate.
      if (data.actif === false) {
        signOut(auth)
        setUser(null)
        setProfile(null)
      } else {
        setProfile(data)
      }
    })

    return unsubscribe
  }, [user])

  // -------------------------------------------------------------------------
  // Connexion (délégation au service d'authentification).
  // -------------------------------------------------------------------------
  const login = useCallback(async (email, password) => {
    await authService.login(email, password)
  }, [])

  // -------------------------------------------------------------------------
  // Déconnexion (délégation au service d'authentification).
  // -------------------------------------------------------------------------
  const logout = useCallback(async () => {
    await authService.logout()
  }, [])

  const value = { user, profile, loading, login, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook d'accès au contexte : à utiliser dans les composants enfants.
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>")
  }
  return context
}