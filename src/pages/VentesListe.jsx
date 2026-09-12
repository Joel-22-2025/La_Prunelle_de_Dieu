// ===========================================================================
// Page /ventes — HISTORIQUE des ventes.
// ---------------------------------------------------------------------------
// Pharmacien : voit UNIQUEMENT ses propres ventes (filtre applicatif ET règles
// Firestore). Admin : voit toutes les ventes + peut annuler (RG-07).
// ===========================================================================
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Eye, FileText, ReceiptText } from 'lucide-react'
import { getVentes, annulerVente } from '@/services/venteService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import DataTable from '@/components/DataTable'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { StatutVenteBadge, ModePaiementBadge } from '@/components/Badge'
import ModalAnnulationVente from '@/components/vente/ModalAnnulationVente'
import { formatMontant, formatDateTime, formatNombre } from '@/lib/format'

const PERIODES = [
  { value: 'jour', label: "Aujourd'hui" },
  { value: '7j', label: '7 derniers jours' },
  { value: '30j', label: '30 derniers jours' },
  { value: 'tout', label: 'Tout' },
]

export default function VentesListe() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const isAdmin = profile?.role === 'admin'

  const [ventes, setVentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('30j')
  const [statut, setStatut] = useState('tous')
  const [annulation, setAnnulation] = useState(null)
  const [annulationLoading, setAnnulationLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let actif = true
    ;(async () => {
      setLoading(true)
      try {
        const liste = await getVentes({
          utilisateurId: isAdmin ? null : user?.uid, // pharmacien : uniquement ses ventes
          limitMax: 500,
        })
        if (actif) setVentes(liste)
      } catch (err) {
        console.error('Erreur de chargement des ventes :', err)
        toast.error("Impossible de charger les ventes")
      } finally {
        if (actif) setLoading(false)
      }
    })()
    return () => { actif = false }
  }, [isAdmin, user?.uid, refreshKey])

  // Filtres période + statut.
  const filtrees = useMemo(() => {
    const maintenant = new Date()
    const debut = new Date()
    if (periode === 'jour') debut.setHours(0, 0, 0, 0)
    else if (periode === '7j') debut.setDate(maintenant.getDate() - 7)
    else if (periode === '30j') debut.setDate(maintenant.getDate() - 30)
    else debut.setFullYear(1900)

    return ventes.filter((v) => {
      const date = v.date ? v.date.toDate() : null
      if (date && date < debut) return false
      if (statut !== 'tous' && v.statut !== statut) return false
      return true
    })
  }, [ventes, periode, statut])

  const totalPeriod = filtrees
    .filter((v) => v.statut === 'validee')
    .reduce((sum, v) => sum + Number(v.montantTotal || 0), 0)

  const confirmerAnnulation = async (motif) => {
    if (!annulation) return
    setAnnulationLoading(true)
    try {
      await annulerVente(annulation.id, { motif, utilisateur: { uid: user?.uid, nom: `${profile?.prenom} ${profile?.nom}`.trim(), role: profile?.role } })
      toast.success(`Vente ${annulation.numero} annulée`, { description: 'Stock remis à niveau.' })
      setAnnulation(null)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error("Annulation impossible", { description: err.message })
    } finally {
      setAnnulationLoading(false)
    }
  }

  const colonnes = [
    {
      key: 'numero',
      header: 'N°',
      sortable: true,
      render: (v) => <span className="font-medium">{v.numero}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (v) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {v.date ? formatDateTime(v.date) : '—'}
        </span>
      ),
    },
    {
      key: 'clientNom',
      header: 'Client',
      render: (v) => v.clientNom || <span className="italic text-muted-foreground">Client de passage</span>,
    },
    ...(isAdmin
      ? [
          {
            key: 'utilisateurNom',
            header: 'Pharmacien',
            render: (v) => <span className="whitespace-nowrap">{v.utilisateurNom}</span>,
          },
        ]
      : []),
    {
      key: 'nombreArticles',
      header: 'Articles',
      render: (v) => formatNombre(v.nombreArticles),
    },
    {
      key: 'montantTotal',
      header: 'Total',
      sortable: true,
      render: (v) => (
        <span className="font-semibold">
          {v.statut === 'validee' ? formatMontant(v.montantTotal) : <s>{formatMontant(v.montantTotal)}</s>}
        </span>
      ),
    },
    {
      key: 'modePaiement',
      header: 'Paiement',
      render: (v) => <ModePaiementBadge mode={v.modePaiement} />,
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (v) => <StatutVenteBadge statut={v.statut} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (v) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/ventes/${v.id}`)}>
            <Eye className="size-4" /> Voir
          </Button>
          {v.factureId && (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/factures/${v.factureId}`)}>
              <FileText className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (loading) return <LoadingSpinner label="Chargement des ventes…" />

  return (
    <div className="space-y-6">
      <PageHeader title="Historique des ventes" description={isAdmin ? 'Toutes les ventes de la pharmacie.' : 'Vos ventes uniquement.'}>
        <Button onClick={() => navigate('/vente')}>
          <ReceiptText className="size-4" /> Nouvelle vente
        </Button>
      </PageHeader>

      {/* Synthèse de la période */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="py-0">
          <CardContent>
            <div className="flex items-center gap-4 py-2.5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Ventes de la période</p>
                <p className="text-xl font-bold">{formatNombre(filtrees.length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent>
            <div className="flex items-center gap-4 py-2.5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <ReceiptText className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires (validé)</p>
                <p className="text-xl font-bold">{formatMontant(totalPeriod)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={colonnes}
        rows={filtrees}
        searchKeys={['numero', 'clientNom', 'utilisateurNom']}
        searchPlaceholder="Rechercher par n°, client, pharmacien…"
        toolbar={
          <>
            <Select value={periode} onValueChange={setPeriode}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                <SelectItem value="validee">Validées</SelectItem>
                <SelectItem value="annulee">Annulées</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && (
              <span className="text-xs text-muted-foreground">
                Cliquez sur « Voir » pour annuler.
              </span>
            )}
          </>
        }
        onRowClick={(v) => navigate(`/ventes/${v.id}`)}
      />

      {/* Annulation d'une vente (admin) */}
      {isAdmin && (
        <ModalAnnulationVente
          open={Boolean(annulation)}
          onOpenChange={(o) => !o && setAnnulation(null)}
          vente={annulation}
          loading={annulationLoading}
          onConfirm={confirmerAnnulation}
        />
      )}

      {!isAdmin && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">Sécurité</Badge>
          Vous ne voyez que vos propres ventes, comme prévu par les règles de la pharmacie.
        </p>
      )}
    </div>
  )
}