// ===========================================================================
// Page : /admin/medicaments/:id — détail d'un médicament.
// ---------------------------------------------------------------------------
// Affiche les informations complètes, le stock actuel, les derniers
// mouvements, et les actions (modifier / désactiver / réactiver).
// Réservée à l'admin (RoleRoute).
// ===========================================================================
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Boxes, History, Pencil, Pill, RefreshCw } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'
import { StockBadge, StatutBadge, TypeMouvementBadge } from '@/components/Badge'
import { desactiverMedicament, getMedicamentById, reactiverMedicament } from '@/services/medicamentService'
import { getMouvementsStock, getStockByMedicamentId, LIBELLES_MOTIF } from '@/services/stockService'
import { formatDate, formatDateTime, formatFCFA, formatNombre } from '@/lib/format'

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value || '—'}</p>
    </div>
  )
}

export default function MedicamentDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [medicament, setMedicament] = useState(null)
  const [stock, setStock] = useState(null)
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [action, setAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Promise.all([getMedicamentById(id), getStockByMedicamentId(id), getMouvementsStock({ medicamentId: id })])
      .then(([med, stockData, mouvementsData]) => {
        if (!mounted) return
        if (!med) {
          setNotFound(true)
          return
        }
        setMedicament(med)
        setStock(stockData)
        setMouvements(mouvementsData.slice(0, 8))
      })
      .catch((err) => {
        console.error(err)
        if (mounted) setNotFound(true)
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [id])

  const confirmerAction = async () => {
    if (!action) return
    setActionLoading(true)
    try {
      if (action === 'desactiver') {
        await desactiverMedicament(id)
        toast.success('Médicament désactivé')
      } else {
        await reactiverMedicament(id)
        toast.success('Médicament réactivé')
      }
      setAction(null)
      const med = await getMedicamentById(id)
      setMedicament(med)
    } catch (err) {
      console.error(err)
      toast.error("L'opération a échoué", { description: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <LoadingSpinner label="Chargement du médicament…" />

  if (notFound || !medicament) {
    return (
      <EmptyState
        icon={Pill}
        title="Médicament introuvable"
        description="Ce médicament n'existe pas."
        action={
          <Button variant="outline" onClick={() => navigate('/admin/medicaments')}>
            Retour à la liste
          </Button>
        }
      />
    )
  }

  const quantite = stock ? Number(stock.quantiteDisponible ?? 0) : 0
  const seuil = Number(medicament.seuilMinimal ?? 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={medicament.nom}
        description={`${medicament.dosage || ''} · ${medicament.categorie || '—'}`.replace('^ · ', '')}
      >
        <Button variant="outline" onClick={() => navigate('/admin/medicaments')}>
          <ArrowLeft /> Retour
        </Button>
        <Button variant="outline" onClick={() => navigate(`/admin/medicaments/${id}/modifier`)}>
          <Pencil /> Modifier
        </Button>
        {medicament.statut === 'actif' ? (
          <Button variant="destructive" onClick={() => setAction('desactiver')}>
            Désactiver
          </Button>
        ) : (
          <Button variant="outline" className="text-success" onClick={() => setAction('reactiver')}>
            <RefreshCw /> Réactiver
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="size-4 text-muted-foreground" /> Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoItem label="Forme pharmaceutique" value={medicament.formePharmaceutique} />
            <InfoItem label="Dosage" value={medicament.dosage} />
            <InfoItem label="Principe actif" value={medicament.principeActif} />
            <InfoItem label="Catégorie" value={medicament.categorie} />
            <InfoItem label="Code-barres" value={medicament.codeBarre} />
            <InfoItem label="Statut" value={<StatutBadge statut={medicament.statut} />} />
          </CardContent>
        </Card>

        {/* Prix et seuil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4 text-muted-foreground" /> Commercial
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoItem label="Prix d'achat" value={formatFCFA(medicament.prixAchat)} />
            <InfoItem label="Prix de vente" value={formatFCFA(medicament.prixVente)} />
            <InfoItem label="Seuil minimal" value={formatNombre(seuil)} />
            <InfoItem label="Créé le" value={formatDate(medicament.createdAt)} />
            <InfoItem label="Modifié le" value={formatDate(medicament.updatedAt)} />
          </CardContent>
        </Card>

        {/* Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4 text-muted-foreground" /> Stock actuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{formatNombre(quantite)}</p>
                <p className="text-xs text-muted-foreground">unité(s) disponible(s)</p>
              </div>
              <StockBadge quantite={quantite} seuil={seuil} className="scale-110" />
            </div>
            <div className="mt-4">
              <Badge variant={stock?.numeroLot ? 'secondary' : 'outline'} className="flex">
                Dernier lot : {stock?.numeroLot || 'non renseigné'}
              </Badge>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/stock/entree?medicamentId=${id}`)}>
              + Entrée
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/stock/sortie?medicamentId=${id}`)}>
              − Sortie
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Derniers mouvements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" /> Derniers mouvements de stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mouvements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun mouvement enregistré pour ce médicament.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Motif</th>
                    <th className="py-2 pr-4 font-medium">Quantité</th>
                    <th className="py-2 pr-4 font-medium">Avant</th>
                    <th className="py-2 font-medium">Après</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvements.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">{formatDateTime(m.date)}</td>
                      <td className="py-2 pr-4">
                        <TypeMouvementBadge type={m.type} />
                      </td>
                      <td className="py-2 pr-4">{LIBELLES_MOTIF[m.motif] || m.motif}</td>
                      <td className="py-2 pr-4 font-medium">{formatNombre(m.quantite)}</td>
                      <td className="py-2 pr-4">{formatNombre(m.quantiteAvant)}</td>
                      <td className="py-2 font-medium">{formatNombre(m.quantiteApres)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4">
            <Button variant="link" asChild className="px-0">
              <Link to={`/admin/stock/mouvements?medicamentId=${id}`}>Voir tout l'historique →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(action)}
        onOpenChange={(open) => !open && setAction(null)}
        title={action === 'desactiver' ? 'Désactiver ce médicament ?' : 'Réactiver ce médicament ?'}
        description={
          action === 'desactiver'
            ? `${medicament.nom} ne sera plus proposé dans les sélections. Le stock existant est conservé.`
            : `${medicament.nom} redevient disponible.`
        }
        confirmLabel={action === 'desactiver' ? 'Désactiver' : 'Réactiver'}
        destructive={action === 'desactiver'}
        loading={actionLoading}
        onConfirm={confirmerAction}
      />
    </div>
  )
}