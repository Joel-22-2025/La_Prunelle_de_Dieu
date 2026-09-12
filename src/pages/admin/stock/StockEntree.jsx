// ===========================================================================
// Page : /admin/stock/entree — entrée de stock (transaction Firestore).
// ---------------------------------------------------------------------------
// Sélection du médicament (autocomplete), quantité, motif, lot + date
// d'expiration optionnels. Affiche le récap: avant / entrée / après.
// Réservée à l'admin (RoleRoute).
// ===========================================================================
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CirclePlus } from 'lucide-react'
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
import { entreeStock, LIBELLES_MOTIF, MOTIFS_ENTREE } from '@/services/stockService'
import { formatNombre } from '@/lib/format'

export default function StockEntree() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const utilisateurNom = [profile?.prenom, profile?.nom].filter(Boolean).join(' ')

  const [medicaments, setMedicaments] = useState([])
  const [medicament, setMedicament] = useState(null)
  const [quantite, setQuantite] = useState('')
  const [motif, setMotif] = useState('reception')
  const [numeroLot, setNumeroLot] = useState('')
  const [dateExpiration, setDateExpiration] = useState('')
  const [motifDetail, setMotifDetail] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recap, setRecap] = useState(null)

  // Chargement du catalogue + présélection éventuelle (?medicamentId=).
  useEffect(() => {
    let mounted = true
    getAllMedicaments()
      .then((meds) => {
        if (!mounted) return
        setMedicaments(meds)
        const preselectedId = searchParams.get('medicamentId')
        if (preselectedId) {
          const med = meds.find((m) => m.id === preselectedId && m.statut === 'actif')
          if (med) setMedicament(med)
        }
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [searchParams])

  const valider = () => {
    const e = {}
    if (!medicament) e.medicament = 'Sélectionnez un médicament.'
    if (!Number.isFinite(Number(quantite)) || Number(quantite) <= 0) {
      e.quantite = 'La quantité doit être un nombre supérieur à 0.'
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
      const resultat = await entreeStock({
        medicamentId: medicament.id,
        quantite: Number(quantite),
        motif,
        numeroLot,
        dateExpiration: dateExpiration ? new Date(dateExpiration) : null,
        motifDetail: motif === 'autre' ? motifDetail : '',
        utilisateurNom,
      })
      setRecap({ medicament, ...resultat, quantite: Number(quantite) })
      toast.success('Entrée de stock enregistrée')
      setQuantite('')
      setNumeroLot('')
      setDateExpiration('')
      setMotifDetail('')
    } catch (err) {
      console.error(err)
      toast.error("L'entrée de stock a échoué", { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner label="Chargement du catalogue…" />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Entrée de stock"
        description="Réception de quantités : le mouvement est enregistré et le stock mis à jour de façon atomique."
      >
        <Button variant="outline" onClick={() => navigate('/admin/stock')}>
          <ArrowLeft /> Retour au stock
        </Button>
      </PageHeader>

      {/* Récapitulatif d'une entrée effectuée */}
      {recap && (
        <Card className="border-success/25 bg-success/5/50 py-4">
          <CardContent className="flex flex-wrap items-center justify-center gap-2 text-center text-sm">
            <span className="font-medium">{recap.medicament.nom}</span>
            <span className="text-muted-foreground">
              Stock initial : <strong>{formatNombre(recap.quantiteAvant)}</strong>
            </span>
            <span>→</span>
            <span className="font-semibold text-success">
              + {formatNombre(recap.quantite)}
            </span>
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
            <CardTitle>Nouvelle entrée</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Médicament *</Label>
              <MedicamentAutocomplete
                medicaments={medicaments}
                value={medicament}
                onChange={setMedicament}
              />
              {errors.medicament && <p className="mt-1 text-xs text-destructive">{errors.medicament}</p>}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="quantite">Quantité reçue *</Label>
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
                    {MOTIFS_ENTREE.map((m) => (
                      <SelectItem key={m} value={m}>
                        {LIBELLES_MOTIF[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="numeroLot">Numéro de lot</Label>
                <Input
                  id="numeroLot"
                  value={numeroLot}
                  onChange={(e) => setNumeroLot(e.target.value)}
                  placeholder="Ex : L240911"
                />
              </div>

              <div>
                <Label htmlFor="dateExpiration">Date d'expiration</Label>
                <Input
                  id="dateExpiration"
                  type="date"
                  value={dateExpiration}
                  onChange={(e) => setDateExpiration(e.target.value)}
                />
              </div>

              {motif === 'autre' && (
                <div className="sm:col-span-2">
                  <Label htmlFor="motifDetail">Précision du motif *</Label>
                  <Textarea
                    id="motifDetail"
                    value={motifDetail}
                    onChange={(e) => setMotifDetail(e.target.value)}
                    placeholder="Décrivez le motif de cette entrée…"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/stock')}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving}>
            <CirclePlus className={`transition-opacity ${saving ? 'opacity-0' : 'opacity-100'}`} />
            <SpinnerInButton busy={saving} />
            Enregistrer l'entrée
          </Button>
        </div>
      </form>
    </div>
  )
}