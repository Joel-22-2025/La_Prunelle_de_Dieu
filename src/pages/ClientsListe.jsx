// ===========================================================================
// Page /clients — LISTE des clients (+ création rapide).
// ===========================================================================
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, UserPlus } from 'lucide-react'
import { getAllClients, createClient } from '@/services/clientService'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import DataTable from '@/components/DataTable'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatDate } from '@/lib/format'

export default function ClientsListe() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  // Formulaire de création rapide.
  const [ouvert, setOuvert] = useState(false)
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [creation, setCreation] = useState(false)

  const charger = async () => {
    try {
      setClients(await getAllClients())
    } catch (err) {
      console.error('Erreur de chargement des clients :', err)
      toast.error("Impossible de charger les clients")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    charger()
  }, [])

  const creer = async (event) => {
    event.preventDefault()
    setCreation(true)
    try {
      const client = await createClient({ nom, telephone, adresse })
      toast.success('Client créé', { description: `${client.nom}` })
      setOuvert(false)
      setNom('')
      setTelephone('')
      setAdresse('')
      await charger()
    } catch (err) {
      toast.error('Création impossible', { description: err.message })
    } finally {
      setCreation(false)
    }
  }

  const colonnes = [
    {
      key: 'nom',
      header: 'Nom',
      sortable: true,
      render: (c) => <span className="font-medium">{c.nom}</span>,
    },
    {
      key: 'telephone',
      header: 'Téléphone',
      render: (c) => <span className="text-muted-foreground">{c.telephone || '—'}</span>,
    },
    {
      key: 'adresse',
      header: 'Adresse',
      render: (c) => <span className="text-muted-foreground">{c.adresse || '—'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Créé le',
      render: (c) => <span className="text-muted-foreground">{formatDate(c.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/clients/${c.id}`)}>
          <Eye className="size-4" /> Fiche
        </Button>
      ),
    },
  ]

  if (loading) return <LoadingSpinner label="Chargement des clients…" />

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="La saisie du client reste facultative lors d'une vente.">
        <Button onClick={() => setOuvert(true)}>
          <UserPlus className="size-4" /> Nouveau client
        </Button>
      </PageHeader>

      <DataTable
        columns={colonnes}
        rows={clients}
        searchKeys={['nom', 'telephone', 'adresse']}
        searchPlaceholder="Rechercher un client…"
        onRowClick={(c) => navigate(`/clients/${c.id}`)}
      />

      {/* Création rapide */}
      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>Seuls le nom et le téléphone sont obligatoires.</DialogDescription>
          </DialogHeader>
          <form onSubmit={creer} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cl-nom">Nom *</Label>
                <Input id="cl-nom" autoFocus required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Koné Awa" />
              </div>
              <div>
                <Label htmlFor="cl-tel">Téléphone *</Label>
                <Input id="cl-tel" required value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="07 00 00 00 00" />
              </div>
            </div>
            <div>
              <Label htmlFor="cl-adr">Adresse (facultatif)</Label>
              <Input id="cl-adr" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Quartier, ville…" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOuvert(false)} disabled={creation}>Annuler</Button>
              <Button type="submit" disabled={creation || !nom.trim() || !telephone.trim()}>
                {creation ? 'Création…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}