// ===========================================================================
// Page /ventes/:id — DÉTAIL d'une vente (avec possibilité d'annulation admin).
// ===========================================================================
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, FileText } from 'lucide-react'
import { getVenteById, annulerVente } from '@/services/venteService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import { StatutVenteBadge, ModePaiementBadge } from '@/components/Badge'
import ModalAnnulationVente from '@/components/vente/ModalAnnulationVente'
import { formatMontant, formatDateTime } from '@/lib/format'

export default function VenteDetails() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const isAdmin = profile?.role === 'admin'

  const [vente, setVente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [annulation, setAnnulation] = useState(false)
  const [annulationLoading, setAnnulationLoading] = useState(false)

  useEffect(() => {
    let actif = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await getVenteById(id)
        if (actif) setVente(data)
      } catch (err) {
        console.error('Erreur de chargement de la vente :', err)
      } finally {
        if (actif) setLoading(false)
      }
    })()
    return () => { actif = false }
  }, [id])

  const confirmerAnnulation = async (motif) => {
    setAnnulationLoading(true)
    try {
      await annulerVente(id, {
        motif,
        utilisateur: {
          uid: user?.uid,
          nom: `${profile?.prenom} ${profile?.nom}`.trim(),
          role: profile?.role,
        },
      })
      toast.success(`Vente ${vente.numero} annulée`, { description: 'Stock remis à niveau.' })
      setAnnulation(false)
      setVente((v) => (v ? { ...v, statut: 'annulee', motifAnnulation: motif } : v))
    } catch (err) {
      toast.error('Annulation impossible', { description: err.message })
    } finally {
      setAnnulationLoading(false)
    }
  }

  if (loading) return <LoadingSpinner label="Chargement de la vente…" />

  if (!vente) {
    return (
      <EmptyState
        title="Vente introuvable"
        description="Cette vente n'existe pas ou a été supprimée."
        action={<Button variant="outline" onClick={() => navigate('/ventes')}>Retour</Button>}
      />
    )
  }

  const clientNom = vente.clientNom || 'Client de passage'
  const estAnnulable = isAdmin && vente.statut === 'validee'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`Vente ${vente.numero}`}
        description={`${formatDateTime(vente.date)} · ${vente.utilisateurNom || '—'}`}
      >
        <Button variant="outline" onClick={() => navigate('/ventes')}>
          <ArrowLeft className="size-4" /> Retour
        </Button>
        {vente.factureId && (
          <Button asChild>
            <Link to={`/factures/${vente.factureId}`}>
              <FileText className="size-4" /> Voir la facture
            </Link>
          </Button>
        )}
        {estAnnulable && (
          <Button variant="destructive" onClick={() => setAnnulation(true)}>
            <Ban className="size-4" /> Annuler cette vente
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="py-0">
          <CardContent>
            <p className="text-sm text-muted-foreground">Statut</p>
            <StatutVenteBadge statut={vente.statut} className="mt-1" />
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent>
            <p className="text-sm text-muted-foreground">Mode de paiement</p>
            <div className="mt-1 flex items-center gap-2">
              <ModePaiementBadge mode={vente.modePaiement} />
              {vente.montantRecu != null && (
                <span className="text-xs text-muted-foreground">
                  reçu {formatMontant(vente.montantRecu)}
                  {vente.rendu != null ? ` · rendu ${formatMontant(vente.rendu)}` : ''}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent>
            <p className="text-sm text-muted-foreground">Client</p>
            <p className="mt-0.5 font-medium">{clientNom}</p>
            {vente.clientTelephone && <p className="text-sm text-muted-foreground">{vente.clientTelephone}</p>}
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="mt-0.5 text-2xl font-bold">{formatMontant(vente.montantTotal)}</p>
            <p className="text-xs text-muted-foreground">{vente.nombreArticles} article(s)</p>
          </CardContent>
        </Card>
      </div>

      <Card className="py-0">
        <CardHeader>
          <CardTitle>Lignes de la vente</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="divide-y">
            {(vente.lignes || []).map((ligne, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{ligne.medicamentNom}</p>
                  {ligne.dosage && <p className="text-xs text-muted-foreground">{ligne.dosage}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-6">
                  <span className="text-muted-foreground">{ligne.quantite} × {formatMontant(ligne.prixUnitaire)}</span>
                  <span className="w-20 text-right font-semibold">{formatMontant(ligne.sousTotal)}</span>
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex items-center justify-between px-6 py-4">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold">{formatMontant(vente.montantTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {vente.statut === 'annulee' && (
        <Card className="gap-0 border-destructive/25 bg-destructive/5 py-4">
          <CardContent>
            <p className="font-semibold text-destructive">Vente annulée</p>
            <p className="text-sm text-destructive">
              {vente.annuleParNom ? `Par ${vente.annuleParNom}` : ''}
              {vente.annuleLe ? ` le ${formatDateTime(vente.annuleLe)}` : ''}
              {vente.motifAnnulation ? ` — Motif : ${vente.motifAnnulation}` : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <ModalAnnulationVente
          open={annulation}
          onOpenChange={setAnnulation}
          vente={vente}
          loading={annulationLoading}
          onConfirm={confirmerAnnulation}
        />
      )}
    </div>
  )
}