// ===========================================================================
// Surveillance de la connexion Internet.
// ---------------------------------------------------------------------------
// Affiche un toast persistant dès que le navigateur passe hors ligne, puis un
// toast de confirmation au retour de la connexion. Monté une seule fois dans
// main.jsx, à côté du Toaster.
// ===========================================================================
import { useEffect, useRef } from 'react'
import { toast } from '@/components/ui/sonner'

const ID_HORS_LIGNE = 'reseau-hors-ligne'
const ID_RETABLI = 'reseau-retabli'

export default function NetworkStatus() {
  const etaitHorsLigne = useRef(typeof navigator !== 'undefined' && !navigator.onLine)

  useEffect(() => {
    const afficherHorsLigne = () => {
      toast.error('Connexion Internet indisponible', {
        id: ID_HORS_LIGNE,
        description:
          'Il semble que vous ne soyez pas connecté. Vérifiez votre connexion Internet, puis réessayez.',
        duration: Infinity,
      })
    }

    const handleOffline = () => {
      etaitHorsLigne.current = true
      afficherHorsLigne()
    }

    const handleOnline = () => {
      if (!etaitHorsLigne.current) return
      etaitHorsLigne.current = false
      toast.dismiss(ID_HORS_LIGNE)
      toast.success('Connexion rétablie', {
        id: ID_RETABLI,
        description: 'Vous pouvez continuer à utiliser l’application.',
      })
    }

    // Filet de sécurité : certains navigateurs ne rejouent pas l'évènement
    // "online/offline" après un passage en arrière-plan de l'onglet.
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (!navigator.onLine) {
        etaitHorsLigne.current = true
        afficherHorsLigne()
      } else {
        handleOnline()
      }
    }

    if (!navigator.onLine) afficherHorsLigne()

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return null
}
