// ===========================================================================
// Page : /admin/stock/sortie — sortie de stock (transaction Firestore).
// ---------------------------------------------------------------------------
// Sélection du médicament (autocomplete), quantité (ne doit pas dépasser le
// disponible), motif + commentaire. Réservée à l'admin (RoleRoute).
// ===========================================================================
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleMinus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { SpinnerInButton } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import MedicamentAutocomplete from '@/components/MedicamentAutocomplete'
import { getAllMedicaments } from '@/services/medicamentService'
import { getStockByMedicamentId, LIBELLES_MOTIF, MOTIFS_SORTIE, sortieStock } from '@/services/stockService'
import { formatNombre } from '@/lib/format'

export default function StockSortie() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const utilisateurNom = [profile?.prenom, profile?.nom].filter(Boolean).join(' ')

  const [medicaments, setMedicaments] = useState([])
  const [medicament, setMedicament] = useState(null)
  const [stock, setStock] = useState(null)
  const [quantite, setQuantite] = useState('')
  const [motif, setMotif] = useState('perte')
  const [motifDetail, setMotifDetail] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recap, setRecap] = useState(null)

  useEffect(() => {
    let mounted = true
    getAllMedicaments()
      .then((meds) => {
        if (!mounted) return
        setMedicaments(meds)
        const preselectedId = searchParams.get('medicamentId')
        if (preselectedId) {
          const med = meds.find((m) => m.id === preselectedId && m.statut === 'actif')
          if (med) {
            setMedicament(med)
            getStockByMedicamentId(med.id).then((s) => mounted && setStock(s))
          }
        }
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [searchParams])

  // Chargement du stock quand un médicament est sélectionné.
  useEffect(() => {
    if (!medicament) {
      setStock(null)
      return
    }
    let mounted = true
    getStockByMedicamentId(medicament.id).then((s) => {
      if (mounted) setStock(s)
    })
    return () => {
      mounted = false
    }
  }, [medicament])

  const disponible = stock ? Number(stock.quantiteDisponible ?? 0) : 0

  const valider = () => {
    const e = {}
    if (!medicament) e.medicament = 'Sélectionnez un médicament.'
    const qte = Number(quantite)
    if (!Number.isFinite(qte) || qte <= 0) {
      e.quantite = 'La quantité doit être un nombre supérieur à 0.'
    } else if (qte > disponible) {
      e.quantite = `Quantité demandée supérieure au disponible (${disponible}).`
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    if (!valider()) {
      toast.error('Formulaire incomplet', { description: 'Vérifiez les champs en rouge.' })
      return
    }

    setSaving(true)
    try {
      const resultat = await sortieStock({
        medicamentId: medicament.id,
        quantite: Number(quantite),
        motif,
        motifDetail: motif === 'autre' ? motifDetail : '',
        utilisateurNom,
      })
      setRecap({ medicament, ...resultat, quantite: Number(quantite) })
      setQuantite('')
      setMotifDetail('')
      toast.success('Sortie de stock enregistrée')
      const updated = await getStockByMedicamentId(medicament.id)
      setStock(updated)
    } catch (err) {
      console.error(err)
      toast.error("La sortie de stock a échoué", { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const onChangeMedicament = (med) => {
    setMedicament(med)
    setRecap(null)
  }

  if (loading) return <LoadingSpinner label="Chargement du catalogue…" />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Sortie de stock"
        description="Retrait manuel (perte, produit endommagé ou expiré) — la quantité ne peut pas dépasser le disponible."
      >
        <Button variant="outline" onClick={() => navigate('/admin/stock')}>
          <ArrowLeft /> Retour au stock
        </Button>
      </PageHeader>

      {recap && (
        <Card className="border-destructive/25 bg-destructive/5 py-4">
          <CardContent className="flex flex-wrap items-center justify-center gap-2 text-center text-sm">
            <span className="font-medium">{recap.medicament.nom}</span>
            <span className="text-muted-foreground">
              Stock initial : <strong>{formatNombre(recap.quantiteAvant)}</strong>
            </span>
            <span>→</span>
            <span className="font-semibold text-destructive">− {formatNombre(recap.quantite)}</span>
            <span>→</span>
            <span className="text-muted-foreground">
              Nouveau stock : <strong>{formatNombre(recap.quantiteApres)}</strong>
            </span>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle sortie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Médicament *</Label>
              <MedicamentAutocomplete
                medicaments={medicaments}
                value={medicament}
                onChange={onChangeMedicament}
              />
              {errors.medicament && <p className="mt-1 text-xs text-destructive">{errors.medicament}</p>}
            </div>

            {medicament && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                Stock actuel :{' '}
                <span className="font-semibold">{formatNombre(disponible)}</span> unité(s){' '}
                {disponible <= Number(medicament.seuilMinimal ?? 0) ? (
                  <span className="text-warning">(alerte : seuil minimal)</span>
                ) : null}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="quantite">Quantité *</Label>
                <Input
                  id="quantite"
                  type="number"
                  min="1"
                  step="1"
                  value={quantite}
                  onChange={(e) => setQuantite(e.target.value)}
                  placeholder="0"
                  className={errors.quantite && 'border-destructive'}
                />
                {errors.quantite && <p className="mt-1 text-xs text-destructive">{errors.quantite}</p>}
              </div>

              <div>
                <Label>Motif *</Label>
                <Select value={motif} onValueChange={setMotif}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIFS_SORTIE.map((m) => (
                      <SelectItem key={m} value={m}>
                        {LIBELLES_MOTIF[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="motifDetail">Commentaire</Label>
                <Textarea
                  id="motifDetail"
                  value={motifDetail}
                  onChange={(e) => setMotifDetail(e.target.value)}
                  placeholder={
                    motif === 'autre'
                      ? 'Décrivez le motif de cette sortie (obligatoire)…'
                      : 'Commentaire libre (optionnel)…'
                  }
                  className={motif === 'autre' && !motifDetail.trim() ? 'border-destructive' : ''}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/stock')}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving} variant="destructive">
            <CircleMinus className={`transition-opacity ${saving ? 'opacity-0' : 'opacity-100'}`} />
            <SpinnerInButton busy={saving} />
            Enregistrer la sortie
          </Button>
        </div>
      </form>
    </div>
  )
}