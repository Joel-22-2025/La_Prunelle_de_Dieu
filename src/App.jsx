import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import PublicRoute from '@/components/PublicRoute'
import RoleRoute from '@/components/RoleRoute'
import Layout from '@/components/Layout'
import SplashScreen from '@/components/SplashScreen'
import { useAuth } from '@/contexts/AuthContext'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Profil from '@/pages/Profil'
import Vente from '@/pages/Vente'
import VentesListe from '@/pages/VentesListe'
import VenteDetails from '@/pages/VenteDetails'
import FacturesListe from '@/pages/FacturesListe'
import FactureDetails from '@/pages/FactureDetails'
import ClientsListe from '@/pages/ClientsListe'
import ClientDetails from '@/pages/ClientDetails'
import AdminUtilisateurs from '@/pages/AdminUtilisateurs'
import MedicamentsListe from '@/pages/admin/MedicamentsListe'
import MedicamentForm from '@/pages/admin/MedicamentForm'
import MedicamentDetails from '@/pages/admin/MedicamentDetails'
import StockOverview from '@/pages/admin/stock/StockOverview'
import StockEntree from '@/pages/admin/stock/StockEntree'
import StockSortie from '@/pages/admin/stock/StockSortie'
import StockInventaire from '@/pages/admin/stock/StockInventaire'
import StockMouvements from '@/pages/admin/stock/StockMouvements'

// Durée minimale d'affichage du splash, puis durée du fondu de sortie (ms).
const DUREE_SPLASH = 4200
const DUREE_FONDU = 520

export default function App() {
  const { loading } = useAuth()

  // Le splash reste visible au moins DUREE_SPLASH et tant que Firebase n'a
  // pas résolu la session, puis disparaît en fondu.
  const [minimumEcoule, setMinimumEcoule] = useState(false)
  const [splashTermine, setSplashTermine] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumEcoule(true), DUREE_SPLASH)
    return () => window.clearTimeout(timer)
  }, [])

  const splashEnSortie = minimumEcoule && !loading

  useEffect(() => {
    if (!splashEnSortie) return undefined
    const timer = window.setTimeout(() => setSplashTermine(true), DUREE_FONDU)
    return () => window.clearTimeout(timer)
  }, [splashEnSortie])

  if (!splashTermine) {
    return <SplashScreen leaving={splashEnSortie} />
  }

  return (
    <Routes>
      {/* Page publique : /login */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Redirection à la racine */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Espace connecté (Layout = barre latérale selon le rôle) */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/vente" element={<Vente />} />
        <Route path="/ventes" element={<VentesListe />} />
        <Route path="/ventes/:id" element={<VenteDetails />} />
        <Route path="/factures" element={<FacturesListe />} />
        <Route path="/factures/:id" element={<FactureDetails />} />
        <Route path="/clients" element={<ClientsListe />} />
        <Route path="/clients/:id" element={<ClientDetails />} />

        {/* Sections réservées à l'admin */}
        <Route
          path="/admin/utilisateurs"
          element={
            <RoleRoute role="admin">
              <AdminUtilisateurs />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/medicaments"
          element={
            <RoleRoute role="admin">
              <MedicamentsListe />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/medicaments/nouveau"
          element={
            <RoleRoute role="admin">
              <MedicamentForm />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/medicaments/:id/modifier"
          element={
            <RoleRoute role="admin">
              <MedicamentForm />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/medicaments/:id"
          element={
            <RoleRoute role="admin">
              <MedicamentDetails />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/stock"
          element={
            <RoleRoute role="admin">
              <StockOverview />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/stock/entree"
          element={
            <RoleRoute role="admin">
              <StockEntree />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/stock/sortie"
          element={
            <RoleRoute role="admin">
              <StockSortie />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/stock/inventaire"
          element={
            <RoleRoute role="admin">
              <StockInventaire />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/stock/mouvements"
          element={
            <RoleRoute role="admin">
              <StockMouvements />
            </RoleRoute>
          }
        />

        {/* Toute autre route : retour au tableau de bord */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}