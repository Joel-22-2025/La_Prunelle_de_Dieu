// ===========================================================================
// Bouton + dialogue « ventes du jour » (réservé à l'admin).
// ---------------------------------------------------------------------------
// Choisit un pharmacien, affiche sa synthèse du jour (ventes validées,
// articles, total) puis génère le PDF du détail des ventes (rapportService).
// ===========================================================================
import { useEffect, useRef, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { FileText, Users } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { db } from '@/firebase/config'
import { Button } from '@/components/ui/button'
import { SpinnerInButton } from '@/components/ui/spinner'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getVentes } from '@/services/venteService'
import { exporterRapportVentesDuJour } from '@/services/rapportService'
import { formatFCFA, formatNombre } from '@/lib/format'

const minuit = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const nomComplet = (u) => `${(u?.prenom || '').trim()} ${(u?.nom || '').trim()}`.trim() || u?.email || '—'

export default function RapportVentesDuJour() {
  const [open, setOpen] = useState(false)
  const [pharmaciens, setPharmaciens] = useState([])
  const [chargementPharmaciens, setChargementPharmaciens] = useState(false)
  const [pharmacienId, setPharmacienId] = useState('')

  const [chiffres, setChiffres] = useState(null)
  const [chargementChiffres, setChargementChiffres] = useState(false)
  const [generation, setGeneration] = useState(false)
  const requeteChiffres = useRef(0)

  // Chargement de la liste des pharmaciens actifs (à l'ouverture).
  useEffect(() => {
    if (!open || pharmaciens.length > 0) return
    setChargementPharmaciens(true)
    getDocs(collection(db, 'users'))
      .then((snap) => {
        const list = []
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }))
        setPharmaciens(
          list
            .filter((u) => u.role === 'pharmacien' && u.actif !== false)
            .sort((a, b) => nomComplet(a).localeCompare(nomComplet(b), 'fr')),
        )
      })
      .catch((err) => {
        console.error('Erreur de chargement des pharmaciens :', err)
        toast.error('Impossible de charger la liste des pharmaciens')
      })
      .finally(() => setChargementPharmaciens(false))
  }, [open, pharmaciens.length])

  // Synthèse du jour du pharmacien sélectionné.
  const chargerChiffres = async (uid) => {
    const pharmacien = pharmaciens.find((u) => u.uid === uid || u.id === uid)
    if (!pharmacien) return

    const id = ++requeteChiffres.current
    setChiffres(null)
    setChargementChiffres(true)

    try {
      const ventes = await getVentes({ utilisateurId: pharmacien.uid, limitMax: 500 })
      if (requeteChiffres.current !== id) return
      const debut = minuit(new Date())
      const duJour = ventes.filter((v) => {
        if (v.statut !== 'validee') return false
        const d = v.date && typeof v.date.toDate === 'function' ? v.date.toDate() : v.date
        return d && d.getTime() >= debut.getTime()
      })
      setChiffres({
        pharmacien,
        ventes: duJour,
        nbVentes: duJour.length,
        totalCA: duJour.reduce((s, v) => s + (Number(v.montantTotal) || 0), 0),
        totalArticles: duJour.reduce((s, v) => s + (Number(v.nombreArticles) || 0), 0),
      })
    } catch (err) {
      console.error('Erreur de chargement des ventes du jour :', err)
      toast.error('Impossible de charger les ventes du jour', { description: err.message })
    } finally {
      if (requeteChiffres.current === id) setChargementChiffres(false)
    }
  }

  const onSelectPharmacien = (uid) => {
    setPharmacienId(uid)
    chargerChiffres(uid)
  }

  const genererPDF = async () => {
    if (!chiffres || chiffres.ventes.length === 0) return
    setGeneration(true)
    try {
      await exporterRapportVentesDuJour({
        pharmacien: { nomComplet: nomComplet(chiffres.pharmacien), role: 'pharmacien' },
        ventes: chiffres.ventes,
        date: new Date(),
      })
      toast.success('Rapport PDF généré')
    } catch (err) {
      console.error('Erreur de génération du rapport :', err)
      toast.error('Échec de la génération du PDF', { description: err.message })
    } finally {
      setGeneration(false)
    }
  }

  const peutGenerer = Boolean(chiffres) && chiffres.nbVentes > 0 && !chargementChiffres

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="default">
          <Users className="size-4" />
          Rapport des ventes du jour
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rapport des ventes du jour</DialogTitle>
          <DialogDescription>
            Sélectionnez un pharmacien puis générez le détail PDF de ses ventes du jour.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rapport-pharmacien">Pharmacien</Label>
            <Select value={pharmacienId} onValueChange={onSelectPharmacien} disabled={chargementPharmaciens}>
              <SelectTrigger id="rapport-pharmacien" className="w-full">
                <SelectValue placeholder={chargementPharmaciens ? 'Chargement…' : 'Choisir un pharmacien'} />
              </SelectTrigger>
              <SelectContent>
                {pharmaciens.map((u) => (
                  <SelectItem key={u.uid} value={u.uid}>
                    {nomComplet(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className="flex min-h-16 items-center justify-center rounded-lg border bg-muted/40 px-4 py-3 text-sm"
            aria-live="polite"
          >
            {chargementChiffres ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <SpinnerInButton busy /> Chargement des ventes du jour…
              </span>
            ) : !chiffres ? (
              pharmacienId ? (
                ''
              ) : (
                <span className="text-muted-foreground">
                  Choisissez un pharmacien pour afficher sa synthèse du jour.
                </span>
              )
            ) : chiffres.nbVentes === 0 ? (
              <span className="text-muted-foreground">
                Aucune vente validée aujourd'hui pour <b className="text-foreground">{nomComplet(chiffres.pharmacien)}</b>.
              </span>
            ) : (
              <div className="w-full space-y-1">
                <p className="font-medium">
                  Ventes validées aujourd'hui : {formatNombre(chiffres.nbVentes)} · {formatNombre(chiffres.totalArticles)} article(s)
                </p>
                <p className="text-lg font-bold">Total : {formatFCFA(chiffres.totalCA)}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
          <Button type="button" onClick={genererPDF} disabled={!peutGenerer}>
            <SpinnerInButton busy={generation} />
            <FileText className="size-4" />
            Générer le PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}