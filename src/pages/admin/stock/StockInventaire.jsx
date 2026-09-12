// ===========================================================================
// Page : /admin/stock/inventaire — comparaison stock théorique / réel.
// ---------------------------------------------------------------------------
// Saisie de la quantité réellement comptée pour les médicaments actifs.
// Écart calculé automatiquement. La validation crée un mouvement de type
// "ajustement" pour chaque ligne modifiée (transaction). Réservée à l'admin.
// ===========================================================================
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, Eraser, Filter, PackageSearch } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { SpinnerInButton } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import MedicamentAutocomplete from '@/components/MedicamentAutocomplete'
import { getAllMedicaments } from '@/services/medicamentService'
import { ajusterStockInventaire, getTousLesStocks } from '@/services/stockService'
import { formatNombre } from '@/lib/format'

export default function StockInventaire() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const utilisateurNom = [profile?.prenom, profile?.nom].filter(Boolean).join(' ')

  const [medicaments, setMedicaments] = useState([])
  const [stocks, setStocks] = useState([])
  // Ligne de saisie pour l'inventaire partiel (optionnel).
  const [filtreMedicament, setFiltreMedicament] = useState(null)
  // Quantités réelles saisies : { medicamentId: nombre | '' }
  const [saisies, setSaisies] = useState({})
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([getAllMedicaments(), getTousLesStocks()])
      .then(([meds, stockList]) => {
        if (!mounted) return
        setMedicaments(meds)
        setStocks(stockList)
        // Présélection éventuelle depuis une autre page.
        const preselectedId = searchParams.get('medicamentId')
        if (preselectedId) {
          const med = meds.find((m) => m.id === preselectedId && m.statut === 'actif')
          if (med) setFiltreMedicament(med)
        }
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [searchParams])

  const theorie = useMemo(() => {
    const map = {}
    for (const s of stocks) map[s.medicamentId] = Number(s.quantiteDisponible ?? 0)
    return map
  }, [stocks])

  // Lignes à traiter : actives, filtrées par la sélection éventuelle.
  const lignes = useMemo(() => {
    return medicaments
      .filter((m) => m.statut === 'actif')
      .filter((m) => (filtreMedicament ? m.id === filtreMedicament.id : true))
      .map((m) => ({ medicament: m, quantiteTheorique: theorie[m.id] ?? 0 }))
  }, [medicaments, filtreMedicament, theorie])

  const setSaisie = (id, value) => {
    setSaisies((prev) => ({ ...prev, [id]: value }))
  }

  const ecart = (ligne) => {
    const reel = saisies[ligne.medicament.id]
    if (reel === '' || reel === undefined || reel === null) return null
    return Number(reel) - ligne.quantiteTheorique
  }

  // Nombre de lignes réellement modifiées.
  const lignesModifiees = lignes.filter((l) => {
    const reel = saisies[l.medicament.id]
    return reel !== '' && reel !== undefined && reel !== null && Number(reel) !== l.quantiteTheorique
  })

  const validerInventaire = async () => {
    if (lignesModifiees.length === 0) {
      toast.info('Aucun écart détecté', { description: 'Saisissez une quantité réelle différente du stock théorique.' })
      return
    }

    setValidating(true)
    const erreurs = []
    let corrections = 0

    for (const ligne of lignesModifiees) {
      try {
        const resultat = await ajusterStockInventaire({
          medicamentId: ligne.medicament.id,
          quantiteReelle: Number(saisies[ligne.medicament.id]),
          utilisateurNom,
        })
        if (resultat.ecart !== 0) corrections++
      } catch (err) {
        erreurs.push(`${ligne.medicament.nom} : ${err.message}`)
      }
    }

    setValidating(false)

    if (erreurs.length > 0) {
      toast.error('Inventaire partiellement appliqué', {
        description: `${corrections} ajustement(s) réussi(s), ${erreurs.length} échec(s).`,
      })
      console.error(erreurs.join('\n'))
    } else {
      toast.success(`Inventaire validé : ${corrections} ajustement(s) enregistré(s)`)
    }

    const list = await getTousLesStocks()
    setStocks(list)
    setSaisies({})
  }

  const reinitialiser = () => {
    setSaisies({})
    setFiltreMedicament(null)
  }

  if (loading) return <LoadingSpinner label="Chargement de l'inventaire…" />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventaire"
        description="Comparez le stock théorique avec la quantité réellement comptée."
      >
        <Button variant="outline" onClick={() => navigate('/admin/stock')}>
          <ArrowLeft /> Retour au stock
        </Button>
      </PageHeader>

      {/* Filtre par médicament */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-md">
          <MedicamentAutocomplete
            medicaments={medicaments}
            value={filtreMedicament}
            onChange={(med) => {
              setFiltreMedicament(med)
              setSaisies({})
            }}
            placeholder="Filtrer par médicament…"
          />
        </div>
        {filtreMedicament ? (
          <Button variant="outline" size="sm" onClick={() => { setFiltreMedicament(null); setSaisies({}) }}>
            <Filter /> Voir tout le catalogue
          </Button>
        ) : null}
      </div>

      {lignes.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Aucun médicament actif"
          description="Créez d'abord des médicaments pour réaliser un inventaire."
          action={
            <Button variant="outline" onClick={() => navigate('/admin/medicaments/nouveau')}>
              Ajouter un médicament
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Médicament</th>
                <th className="px-4 py-3 text-right">Théorique</th>
                <th className="px-4 py-3 text-right">Réel compté</th>
                <th className="px-4 py-3 text-right">Écart</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne) => {
                const diff = ecart(ligne)
                return (
                  <tr key={ligne.medicament.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{ligne.medicament.nom}</p>
                      <p className="text-xs text-muted-foreground">{ligne.medicament.dosage || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatNombre(ligne.quantiteTheorique)}
                    </td>
                    <td className="w-36 px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={saisies[ligne.medicament.id] ?? ''}
                        onChange={(e) => setSaisie(ligne.medicament.id, e.target.value)}
                        placeholder={String(ligne.quantiteTheorique)}
                        aria-label={`Quantité réelle pour ${ligne.medicament.nom}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {diff === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : diff === 0 ? (
                        <span className="font-medium text-success">0</span>
                      ) : diff > 0 ? (
                        <span className="font-semibold text-success">+{formatNombre(diff)}</span>
                      ) : (
                        <span className="font-semibold text-destructive">{formatNombre(diff)}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={reinitialiser} disabled={validating}>
          <Eraser /> Réinitialiser
        </Button>
        <Button onClick={validerInventaire} disabled={validating || lignes.length === 0} className="gap-2">
          <ClipboardCheck className={`transition-opacity ${validating ? 'opacity-0' : 'opacity-100'}`} />
          <SpinnerInButton busy={validating} />
          {`Valider l'inventaire${lignesModifiees.length ? ` (${lignesModifiees.length} ajustement(s))` : ''}`}
        </Button>
      </div>
    </div>
  )
}