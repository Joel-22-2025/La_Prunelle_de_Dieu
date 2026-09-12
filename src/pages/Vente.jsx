// ===========================================================================
// Page /vente — CAISSE ENREGISTREUSE (2 colonnes plein écran).
// ---------------------------------------------------------------------------
// Objectif : vente en MOINS DE 30 SECONDES. Aucun rechargement de page entre
// deux ventes. Raccourcis clavier : F1 ou "/" recherche, Entrée ajouter,
// F2 valider, F3 vider le panier, Échap effacer, +/- quantité, Suppr supprime.
// Doublette USB : détection automatique (frappe rapide) — ajout direct.
// ===========================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { getAllMedicaments } from '@/services/medicamentService'
import { getTousLesStocks } from '@/services/stockService'
import { creerVente } from '@/services/venteService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import RechercheMedicament from '@/components/vente/RechercheMedicament'
import PanierVente from '@/components/vente/PanierVente'
import ModalValidationVente from '@/components/vente/ModalValidationVente'
import PageHeader from '@/components/PageHeader'

// Détection d'un scan de douchette : plusieurs frappes très rapprochées
// (< 60 ms) suivies d'Entrée, avec un code d'au moins 5 caractères.
function estUnScan(code, scanRef) {
  if (code.trim().length < 5) return false
  if (!scanRef.current.prev || !scanRef.current.now) return false
  return scanRef.current.now - scanRef.current.prev < 60
}

const ajusterDans = (value, min, max) => Math.min(max, Math.max(min, value))

export default function Vente() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [medicaments, setMedicaments] = useState([])
  const [stocks, setStocks] = useState({})
  const [chargement, setChargement] = useState(true)

  const [recherche, setRecherche] = useState('')
  const [rechercheDebounce, setRechercheDebounce] = useState('')
  const [lignes, setLignes] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [modalOuvert, setModalOuvert] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erreurVente, setErreurVente] = useState('')
  const [succes, setSucces] = useState({ vente: null, facture: null })
  const [refreshKey, setRefreshKey] = useState(0)

  const searchRef = useRef(null)
  const scanRef = useRef({ prev: null, now: null })

  // -------------------------------------------------------------------------
  // Chargement initial du catalogue + stocks / rechargement après chaque vente.
  // -------------------------------------------------------------------------
  useEffect(() => {
    let actif = true
    ;(async () => {
      setChargement(true)
      try {
        const [meds, stockList] = await Promise.all([getAllMedicaments(), getTousLesStocks()])
        if (!actif) return
        setMedicaments(meds.filter((m) => m.statut === 'actif'))
        const carte = {}
        stockList.forEach((s) => {
          carte[s.medicamentId || s.id] = Number(s.quantiteDisponible ?? 0)
        })
        setStocks(carte)
      } catch (err) {
        console.error('Erreur de chargement de la caisse :', err)
        toast.error("Impossible de charger le catalogue")
      } finally {
        if (actif) setChargement(false)
      }
    })()
    return () => { actif = false }
  }, [refreshKey])

  // Recherche dé-bouncée (150 ms maximum).
  useEffect(() => {
    const delai = setTimeout(() => setRechercheDebounce(recherche), 150)
    return () => clearTimeout(delai)
  }, [recherche])

  // Résultats de recherche : actifs, avec stock, limités à 10.
  const resultats = useMemo(() => {
    const q = rechercheDebounce.trim().toLowerCase()
    if (!q) return []
    const filtre = (m) =>
      String(m.nom ?? '').toLowerCase().includes(q) ||
      String(m.codeBarre ?? '').toLowerCase().includes(q) ||
      String(m.principeActif ?? '').toLowerCase().includes(q) ||
      String(m.formePharmaceutique ?? '').toLowerCase().includes(q)
    return medicaments
      .filter(filtre)
      .map((medicament) => ({
        medicament,
        quantiteDisponible: stocks[medicament.id] ?? 0,
      }))
      .slice(0, 10)
  }, [medicaments, rechercheDebounce, stocks])

  // Panier
  const quantiteEnPanierDe = (medicamentId) =>
    lignes.reduce((sum, l) => (l.medicament.id === medicamentId ? sum + l.quantite : sum), 0)

  const dispoDe = (medicament) => (stocks[medicament.id] ?? 0) - quantiteEnPanierDe(medicament.id)

  const ajouter = (medicament) => {
    if (!medicament) return
    if (dispoDe(medicament) <= 0) {
      toast.error('Stock insuffisant', { description: `Il reste ${stocks[medicament.id] ?? 0} unité(s) en stock.` })
      return
    }
    setLignes((prev) => {
      const existante = prev.find((l) => l.medicament.id === medicament.id)
      if (existante) {
        return prev.map((l) =>
          l.medicament.id === medicament.id ? { ...l, quantite: l.quantite + 1 } : l,
        )
      }
      return [...prev, { medicament, quantite: 1 }]
    })
    setSelectedIndex(-1)
    setRecherche('')
    setRechercheDebounce('')
    searchRef.current?.focus()
  }

  const changerQuantite = (index, valeur) => {
    const ligne = lignes[index]
    if (!ligne) return
    if (valeur <= 0) {
      retirer(index)
      return
    }
    const max = ajusterDans(valeur, 1, Math.max(1, stocks[ligne.medicament.id] ?? 1))
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, quantite: max } : l)))
  }

  const retirer = (index) => {
    setLignes((prev) => prev.filter((_, i) => i !== index))
    setSelectedIndex((sel) => (sel === index ? -1 : sel > index ? sel - 1 : sel))
  }

  const viderPanier = () => {
    setLignes([])
    setSelectedIndex(-1)
    setRecherche('')
    setRechercheDebounce('')
    searchRef.current?.focus()
  }

  const total = lignes.reduce((sum, l) => sum + l.medicament.prixVente * l.quantite, 0)
  const nombreArticles = lignes.reduce((sum, l) => sum + l.quantite, 0)

  // Ajout via la touche Entrée (scan douchette ou 1er résultat).
  const traiterEntree = () => {
    const code = recherche
    const scan = estUnScan(code, scanRef)
    if (scan) {
      const med = medicaments.find((m) => m.codeBarre && m.codeBarre.trim() === code.trim())
      if (med) {
        ajouter(med)
      } else {
        toast.error('Aucun produit pour ce code-barres', { description: code })
      }
      setRecherche('')
      setRechercheDebounce('')
      searchRef.current?.focus()
      return
    }

    if (resultats.length > 0) {
      ajouter(resultats[0].medicament)
      setRecherche('')
      setRechercheDebounce('')
      searchRef.current?.focus()
    }
  }

  // Pré-contrôle de stock avant d'ouvrir la modale : rafraîchit la carte des
  // stocks et prévient l'utilisateur si le panier dépasse la disponibilité
  // réelle (la transaction Firestore reste la source de vérité).
  const ouvrirValidation = async () => {
    setErreurVente('')
    try {
      const stockList = await getTousLesStocks()
      const derniereCarte = {}
      for (const stock of stockList) {
        derniereCarte[stock.medicamentId || stock.id] = Number(stock.quantiteDisponible ?? 0)
      }
      setStocks(derniereCarte)

      const manquants = lignes
        .map((ligne) => ({
          nom: ligne.medicament.nom,
          quantite: ligne.quantite,
          dispo: derniereCarte[ligne.medicament.id] ?? 0,
        }))
        .filter((l) => l.dispo < l.quantite)

      if (manquants.length > 0) {
        const detail = manquants.map((m) => `${m.nom} (dispo : ${m.dispo})`).join(', ')
        toast.error('Stock insuffisant', {
          description: `${detail}. Passez par une entrée de stock pour réapprovisionner.`,
        })
        return
      }
    } catch {
      // Lecture optionnelle : la transaction trancera quoi qu'il arrive.
    }
    setModalOuvert(true)
  }

  // Raccourcis clavier globaux.
  useEffect(() => {
    const onKey = (event) => {
      if (modalOuvert) return // dans le modal, Entrée/Échap sont gérés par le formulaire

      const cible = document.activeElement
      const enSaisie = cible?.tagName === 'INPUT' || cible?.tagName === 'TEXTAREA'

      if (event.key === 'F1' || event.key === 'F2' || event.key === 'F3') event.preventDefault()

      if (event.key === 'F1' || event.key === '/') {
        if (event.key === '/' && enSaisie) return // laisser taper "/" normalement
        searchRef.current?.focus()
        event.preventDefault()
        return
      }
      if (event.key === 'Escape') {
        setRecherche('')
        setRechercheDebounce('')
        searchRef.current?.focus()
        event.preventDefault()
        return
      }
      if (event.key === 'F2') {
        if (lignes.length > 0) ouvrirValidation()
        return
      }
      if (event.key === 'F3') {
        viderPanier()
        return
      }

      // Quantité / navigation / suppression : uniquement hors saisie texte.
      if (enSaisie) return
      if (selectedIndex < 0) return

      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        changerQuantite(selectedIndex, lignes[selectedIndex].quantite + 1)
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        changerQuantite(selectedIndex, lignes[selectedIndex].quantite - 1)
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        retirer(selectedIndex)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((s) => Math.max(0, s - 1))
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((s) => Math.min(lignes.length - 1, s + 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // exécuté à chaque rendu : accès aux valeurs récentes de lignes/selectedIndex.

// Validation de la vente.
  const validerVente = async ({ modePaiement, montantRecu, client }) => {
    setSubmitting(true)
    setErreurVente('')
    try {
      const resultat = await creerVente({
        lignes: lignes.map((l) => ({
          medicamentId: l.medicament.id,
          medicamentNom: l.medicament.nom,
          dosage: l.medicament.dosage || '',
          prixUnitaire: l.medicament.prixVente,
          quantite: l.quantite,
        })),
        modePaiement,
        montantRecu,
        client,
        utilisateur: {
          uid: user?.uid,
          nom: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
          role: profile?.role,
        },
      })
      const { vente, facture } = resultat
      setSucces({ vente, facture })
      setLignes([])
      setSelectedIndex(-1)
      setRecherche('')
      setRechercheDebounce('')
      setModalOuvert(false)
      setRefreshKey((k) => k + 1) // recharger les stocks
      toast.success(`Vente ${vente.numero} validée`, { description: `${total} F — facture ${facture.numero}` })
      searchRef.current?.focus()
    } catch (err) {
      setErreurVente(err.message || 'Échec de la validation')
      toast.error('Vente refusée', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (chargement) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
        Chargement de la caisse…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Caisse"
        description="Scannez un produit et validez — objectif : moins de 30 secondes par vente."
        className="print:hidden"
      />

      {/* Bandeau de succès post-vente */}
      {succes.vente && (
        <div className="print:hidden flex items-center justify-between gap-4 rounded-lg border border-success/25 bg-success/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-6 text-success" />
            <div>
              <p className="font-semibold text-success">
                Vente {succes.vente.numero} validée — {total} F
              </p>
              <p className="text-sm text-success">Facture {succes.facture.numero} générée.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => navigate(`/factures/${succes.facture.id}?print=1`)}
            >
              Imprimer la facture
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/factures/${succes.facture.id}`)}
            >
              Voir la facture
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSucces({ vente: null, facture: null })}>
              Nouvelle vente
            </Button>
          </div>
        </div>
      )}

      {/* 2 colonnes plein écran */}
      <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Recherche (60 %) */}
        <div className="lg:col-span-3">
          <RechercheMedicament
            valeur={recherche}
            onChange={(v) => {
              setRecherche(v)
              scanRef.current = { prev: scanRef.current.now, now: Date.now() }
            }}
            onEffacer={() => {
              setRecherche('')
              setRechercheDebounce('')
              searchRef.current?.focus()
            }}
            onAjouter={(med) => (med ? ajouter(med) : traiterEntree())}
            inputRef={searchRef}
            resultats={resultats}
          />
        </div>

        {/* Panier (40 %) */}
        <div className="lg:col-span-2">
          <PanierVente
            lignes={lignes}
            total={total}
            nombreArticles={nombreArticles}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            onQtyChange={changerQuantite}
            onRemove={retirer}
            onValider={() => ouvrirValidation()}
            onVider={viderPanier}
          />
        </div>
      </div>

      {/* Modal de validation unique */}
      <ModalValidationVente
        open={modalOuvert}
        onOpenChange={setModalOuvert}
        total={total}
        nombreArticles={nombreArticles}
        submitting={submitting}
        erreur={erreurVente}
        onConfirmed={validerVente}
      />
    </div>
  )
}