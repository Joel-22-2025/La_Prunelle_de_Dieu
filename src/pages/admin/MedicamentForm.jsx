// ===========================================================================
// Page : /admin/medicaments/nouveau et /admin/medicaments/:id/modifier
// ---------------------------------------------------------------------------
// Formulaire de création / modification d'un médicament.
// Validation côté client : champs obligatoires, prix > 0, code-barres unique.
// Réservée à l'admin (RoleRoute).
// ===========================================================================
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { SpinnerInButton } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import {
  CATEGORIES,
  FORMES_PHARMACEUTIQUES,
  createMedicament,
  getMedicamentById,
  updateMedicament,
} from '@/services/medicamentService'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { cn } from '@/lib/utils'

const VIDE = {
  nom: '',
  formePharmaceutique: '',
  dosage: '',
  principeActif: '',
  categorie: '',
  codeBarre: '',
  prixAchat: '',
  prixVente: '',
  seuilMinimal: '',
}

// Le code-barres ne doit exister que sur un seul médicament.
async function codeBarreDejaUtilise(code, excludeId) {
  const q = query(collection(db, 'medicaments'), where('codeBarre', '==', code), limit(1))
  const snapshot = await getDocs(q)
  const found = snapshot.docs[0]
  return Boolean(found && found.id !== excludeId)
}

export default function MedicamentForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [values, setValues] = useState(VIDE)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Chargement du médicament en mode édition.
  useEffect(() => {
    if (!isEdit) return
    let mounted = true
    setLoading(true)
    getMedicamentById(id)
      .then((medicament) => {
        if (!mounted) return
        if (!medicament) {
          setNotFound(true)
          return
        }
        setValues({
          nom: medicament.nom,
          formePharmaceutique: medicament.formePharmaceutique,
          dosage: medicament.dosage,
          principeActif: medicament.principeActif,
          categorie: medicament.categorie,
          codeBarre: medicament.codeBarre || '',
          prixAchat: medicament.prixAchat ?? '',
          prixVente: medicament.prixVente ?? '',
          seuilMinimal: medicament.seuilMinimal ?? '',
        })
      })
      .catch((err) => {
        console.error(err)
        setNotFound(true)
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [id, isEdit])

  const set = (field) => (e) => {
    const value = e && e.target ? e.target.value : e
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  // -------------------------------------------------------------------------
  // Validation côté client.
  // -------------------------------------------------------------------------
  const valider = async () => {
    const e = {}

    if (!values.nom.trim()) e.nom = 'Le nom est obligatoire.'
    if (!values.formePharmaceutique) e.formePharmaceutique = 'Choisissez une forme.'
    if (!values.categorie) e.categorie = 'Choisissez une catégorie.'

    const pa = Number(values.prixAchat)
    const pv = Number(values.prixVente)
    const seuil = Number(values.seuilMinimal)

    if (values.prixAchat === '' || values.prixAchat === null || !(pa >= 0)) {
      e.prixAchat = "Le prix d'achat doit être un nombre positif."
    } else {
      e.prixAchat = undefined
    }
    if (values.prixVente === '' || values.prixVente === null || !(pv > 0)) {
      e.prixVente = 'Le prix de vente doit être supérieur à 0.'
    } else {
      e.prixVente = undefined
    }
    if (values.seuilMinimal === '' || values.seuilMinimal === null || !(seuil >= 0)) {
      e.seuilMinimal = 'Le seuil minimal doit être un nombre positif ou nul.'
    } else {
      e.seuilMinimal = undefined
    }

    if (values.codeBarre.trim()) {
      const existe = await codeBarreDejaUtilise(values.codeBarre.trim(), id)
      if (existe) e.codeBarre = 'Ce code-barres est déjà utilisé par un autre médicament.'
    }

    setErrors(e)
    return Object.values(e).every((v) => v === undefined)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return

    const ok = await valider()
    if (!ok) {
      toast.error('Formulaire incomplet', { description: 'Vérifiez les champs en rouge.' })
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateMedicament(id, values)
        toast.success('Médicament modifié')
      } else {
        await createMedicament(values, user?.uid)
        toast.success('Médicament créé')
      }
      navigate('/admin/medicaments')
    } catch (err) {
      console.error(err)
      toast.error("L'enregistrement a échoué", { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner label="Chargement du médicament…" />

  if (notFound) {
    return (
      <EmptyState
        title="Médicament introuvable"
        description="Ce médicament n'existe pas ou a été supprimé."
        action={
          <Button variant="outline" onClick={() => navigate('/admin/medicaments')}>
            Retour à la liste
          </Button>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={isEdit ? 'Modifier le médicament' : 'Nouveau médicament'}
        description={
          isEdit
            ? 'Modifiez les informations du médicament puis enregistrez.'
            : 'Ajoutez une nouvelle référence au catalogue.'
        }
      >
        <Button variant="outline" onClick={() => navigate('/admin/medicaments')}>
          <ArrowLeft /> Retour
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informations du médicament</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="nom">Nom commercial *</Label>
                <Input
                  id="nom"
                  value={values.nom}
                  onChange={set('nom')}
                  placeholder="Ex : Doliprane"
                  className={errors.nom && 'border-destructive'}
                />
                {errors.nom && <p className="mt-1 text-xs text-destructive">{errors.nom}</p>}
              </div>

              <div>
                <Label htmlFor="principeActif">Principe actif</Label>
                <Input
                  id="principeActif"
                  value={values.principeActif}
                  onChange={set('principeActif')}
                  placeholder="Ex : paracétamol"
                />
              </div>

              <div>
                <Label htmlFor="dosage">Dosage</Label>
                <Input
                  id="dosage"
                  value={values.dosage}
                  onChange={set('dosage')}
                  placeholder="Ex : 500 mg"
                />
              </div>

              <div>
                <Label>Forme pharmaceutique *</Label>
                <Select value={values.formePharmaceutique || undefined} onValueChange={set('formePharmaceutique')}>
                  <SelectTrigger className={cn('w-full', errors.formePharmaceutique && 'border-destructive')}>
                    <SelectValue placeholder="Choisir une forme" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMES_PHARMACEUTIQUES.map((forme) => (
                      <SelectItem key={forme} value={forme}>
                        {forme}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.formePharmaceutique && (
                  <p className="mt-1 text-xs text-destructive">{errors.formePharmaceutique}</p>
                )}
              </div>

              <div>
                <Label>Catégorie *</Label>
                <Select value={values.categorie || undefined} onValueChange={set('categorie')}>
                  <SelectTrigger className={cn('w-full', errors.categorie && 'border-destructive')}>
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((categorie) => (
                      <SelectItem key={categorie} value={categorie} className="capitalize">
                        {categorie}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categorie && (
                  <p className="mt-1 text-xs text-destructive">{errors.categorie}</p>
                )}
              </div>

              <div>
                <Label htmlFor="codeBarre">Code-barres (GTIN/EAN)</Label>
                <Input
                  id="codeBarre"
                  value={values.codeBarre}
                  onChange={set('codeBarre')}
                  placeholder="Ex : 3400930269628"
                  inputMode="numeric"
                  className={errors.codeBarre && 'border-destructive'}
                />
                {errors.codeBarre && (
                  <p className="mt-1 text-xs text-destructive">{errors.codeBarre}</p>
                )}
              </div>

              <div className="grid gap-5 sm:col-span-2 sm:grid-cols-3">
                <div>
                  <Label htmlFor="prixAchat">Prix d'achat (€) *</Label>
                  <Input
                    id="prixAchat"
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.prixAchat}
                    onChange={set('prixAchat')}
                    placeholder="0.00"
                    className={errors.prixAchat && 'border-destructive'}
                  />
                  {errors.prixAchat && (
                    <p className="mt-1 text-xs text-destructive">{errors.prixAchat}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="prixVente">Prix de vente (€) *</Label>
                  <Input
                    id="prixVente"
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.prixVente}
                    onChange={set('prixVente')}
                    placeholder="0.00"
                    className={errors.prixVente && 'border-destructive'}
                  />
                  {errors.prixVente && (
                    <p className="mt-1 text-xs text-destructive">{errors.prixVente}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="seuilMinimal">Seuil minimal (alerte) *</Label>
                  <Input
                    id="seuilMinimal"
                    type="number"
                    min="0"
                    step="1"
                    value={values.seuilMinimal}
                    onChange={set('seuilMinimal')}
                    placeholder="0"
                    className={errors.seuilMinimal && 'border-destructive'}
                  />
                  {errors.seuilMinimal && (
                    <p className="mt-1 text-xs text-destructive">{errors.seuilMinimal}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/medicaments')}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving} className="min-w-40">
            <Save className={`transition-opacity ${saving ? 'opacity-0' : 'opacity-100'}`} />
            <SpinnerInButton busy={saving} />
            {isEdit ? 'Enregistrer les modifications' : 'Créer le médicament'}
          </Button>
        </div>
      </form>
    </div>
  )
}