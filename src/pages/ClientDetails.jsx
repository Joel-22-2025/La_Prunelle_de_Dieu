// ===========================================================================
// Page /clients/:id — FICHE client + historique de ses achats.
// ===========================================================================
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Phone, ReceiptText } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getClientById, getHistoriqueAchats } from '@/services/clientService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import { StatutVenteBadge, ModePaiementBadge } from '@/components/Badge'
import { formatMontant, formatDateTime, formatNombre } from '@/lib/format'

export default function ClientDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, role } = useAuth()

  const [client, setClient] = useState(null)
  const [achats, setAchats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let actif = true
    ;(async () => {
      setLoading(true)
      try {
        const utilisateurId = role === 'pharmacien' ? user?.uid : null
        const [clientData, achatsData] = await Promise.all([
          getClientById(id),
          getHistoriqueAchats(id, utilisateurId),
        ])
        if (actif) {
          setClient(clientData)
          setAchats(achatsData)
        }
      } catch (err) {
        console.error('Erreur de chargement de la fiche client :', err)
      } finally {
        if (actif) setLoading(false)
      }
    })()
    return () => { actif = false }
  }, [id, role, user?.uid])

  if (loading) return <LoadingSpinner label="Chargement de la fiche client…" />

  if (!client) {
    return (
      <EmptyState
        title="Client introuvable"
        description="Ce client n'existe pas ou a été supprimé."
        action={<Button variant="outline" onClick={() => navigate('/clients')}>Retour</Button>}
      />
    )
  }

  const totalValide = achats
    .filter((a) => a.statut === 'validee')
    .reduce((sum, a) => sum + Number(a.montantTotal || 0), 0)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Fiche client`} description={client.nom}>
        <Button variant="outline" onClick={() => navigate('/clients')}>
          <ArrowLeft className="size-4" /> Retour
        </Button>
      </PageHeader>

      <Card className="gap-0 py-5">
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
              {(client.nom || 'C').charAt(0).toUpperCase()}
            </span>
            <div>
              <h2 className="text-xl font-semibold">{client.nom}</h2>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="size-3.5" /> {client.telephone || '—'}
              </p>
              <p className="text-sm text-muted-foreground">{client.adresse || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-5">
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre de ventes (validées)</p>
              <p className="text-lg font-bold">{formatNombre(achats.filter((a) => a.statut === 'validee').length)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Montant cumulé</p>
              <p className="text-lg font-bold">{formatMontant(totalValide)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader>
          <CardTitle>Historique des achats ({achats.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {achats.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">Aucun achat enregistré.</p>
          ) : (
            <div className="divide-y">
              {achats.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <ReceiptText className="size-4 text-primary" />
                      {a.numero}
                      <StatutVenteBadge statut={a.statut} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(a.date)} · {a.nombreArticles} article(s)
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <ModePaiementBadge mode={a.modePaiement} className="hidden sm:inline-flex" />
                    <span className="font-semibold">{formatMontant(a.montantTotal)}</span>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/ventes/${a.id}`)}>
                      <Eye className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}