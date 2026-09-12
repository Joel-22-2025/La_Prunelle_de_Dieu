// ===========================================================================
// Page : /admin/medicaments — liste des médicaments.
// ---------------------------------------------------------------------------
// Tableau paginé + recherche instantanée (nom, code-barres, principe actif,
// catégorie) + filtres (catégorie, statut, niveau de stock) + badge de
// stock (rupture / faible / ok). Désactivation sans suppression définitive.
// Réservée à l'admin (RoleRoute).
// ===========================================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Pill, Plus, Power, RefreshCw } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import DataTable from '@/components/DataTable'
import PageHeader from '@/components/PageHeader'
import ConfirmDialog from '@/components/ConfirmDialog'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import { StockBadge, StatutBadge } from '@/components/Badge'
import {
  CATEGORIES,
  CHAMPS_RECHERCHE,
  desactiverMedicament,
  getAllMedicaments,
  reactiverMedicament,
} from '@/services/medicamentService'
import { getTousLesStocks } from '@/services/stockService'
import { formatFCFA, formatNombre } from '@/lib/format'

// Calcul du niveau de stock d'un médicament à partir de sa fiche stock.
const niveauStock = (stock) => {
  if (!stock) return 'rupture'
  const quantite = Number(stock.quantiteDisponible ?? 0)
  if (quantite <= 0) return 'rupture'
  if (quantite <= Number(stock.seuilMinimal ?? 0)) return 'faible'
  return 'ok'
}

export default function MedicamentsListe() {
  const navigate = useNavigate()

  const [medicaments, setMedicaments] = useState([])
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filtres manuels.
  const [filtreCategorie, setFiltreCategorie] = useState('toutes')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [filtreStock, setFiltreStock] = useState('tous')

  // Confirmation de désactivation / réactivation.
  const [action, setAction] = useState(null) // { medicament, mode: 'desactiver' | 'reactiver' }
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [meds, stockList] = await Promise.all([getAllMedicaments(), getTousLesStocks()])
      setMedicaments(meds)
      setStocks(stockList)
    } catch (err) {
      console.error('Erreur de chargement des médicaments :', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Lignes enrichies (médicament + quantité + niveau).
  const rows = useMemo(() => {
    return medicaments.map((m) => {
      const stock = stocks.find((s) => s.medicamentId === m.id)
      return {
        ...m,
        quantite: stock ? Number(stock.quantiteDisponible ?? 0) : 0,
        seuil: Number(m.seuilMinimal ?? 0),
        niveau: niveauStock(stock),
      }
    })
  }, [medicaments, stocks])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filtreCategorie !== 'toutes' && r.categorie !== filtreCategorie) return false
      if (filtreStatut !== 'tous' && r.statut !== filtreStatut) return false
      if (filtreStock === 'faible' && r.niveau !== 'faible') return false
      if (filtreStock === 'rupture' && r.niveau !== 'rupture') return false
      return true
    })
  }, [rows, filtreCategorie, filtreStatut, filtreStock])

  const confirmerAction = async () => {
    if (!action) return
    setActionLoading(true)
    try {
      if (action.mode === 'desactiver') {
        await desactiverMedicament(action.medicament.id)
        toast.success('Médicament désactivé')
      } else {
        await reactiverMedicament(action.medicament.id)
        toast.success('Médicament réactivé')
      }
      setAction(null)
      await load()
    } catch (err) {
      console.error(err)
      toast.error("L'opération a échoué", { description: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    {
      key: 'nom',
      header: 'Médicament',
      sortable: true,
      className: 'min-w-56',
      render: (m) => (
        <div>
          <p className="font-medium text-foreground">{m.nom}</p>
          <p className="text-xs text-muted-foreground">{m.dosage || '—'}</p>
        </div>
      ),
    },
    {
      key: 'categorie',
      header: 'Catégorie',
      render: (m) => <span className="capitalize text-muted-foreground">{m.categorie || '—'}</span>,
    },
    {
      key: 'prixAchat',
      header: 'Achat',
      render: (m) => formatFCFA(m.prixAchat),
    },
    {
      key: 'prixVente',
      header: 'Vente',
      render: (m) => formatFCFA(m.prixVente),
    },
    {
      key: 'quantite',
      header: 'Stock',
      render: (m) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatNombre(m.quantite)}</span>
          <StockBadge quantite={m.quantite} seuil={m.seuil} />
        </div>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (m) => <StatutBadge statut={m.statut} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (m) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/medicaments/${m.id}`)} aria-label="Voir">
            <Eye className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/medicaments/${m.id}/modifier`)} aria-label="Modifier">
            <Pencil className="size-4" />
          </Button>
          {m.statut === 'actif' ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => setAction({ medicament: m, mode: 'desactiver' })}
              aria-label="Désactiver"
            >
              <Power className="size-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-success hover:text-success"
              onClick={() => setAction({ medicament: m, mode: 'reactiver' })}
              aria-label="Réactiver"
            >
              <RefreshCw className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (loading) {
    return <LoadingSpinner label="Chargement des médicaments…" />
  }

  if (error && medicaments.length === 0) {
    return (
      <EmptyState
        icon={Pill}
        title="Impossible de charger les médicaments"
        description={error}
        action={
          <Button variant="outline" onClick={load}>
            Réessayer
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Médicaments"
        description="Catalogue des médicaments (réservé à l'administration)."
      >
        <Button onClick={() => navigate('/admin/medicaments/nouveau')}>
          <Plus /> Nouveau médicament
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        searchKeys={CHAMPS_RECHERCHE}
        searchPlaceholder="Rechercher (nom, code-barres, principe actif, catégorie)…"
        keyField="id"
        emptyTitle="Aucun médicament"
        emptyDescription="Modifiez vos critères ou créez un nouveau médicament."
        toolbar={
          <>
            <Select value={filtreCategorie} onValueChange={setFiltreCategorie}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les catégories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtreStatut} onValueChange={setFiltreStatut}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                <SelectItem value="actif">Actifs</SelectItem>
                <SelectItem value="inactif">Inactifs</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtreStock} onValueChange={setFiltreStock}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes les quantités</SelectItem>
                <SelectItem value="faible">Stock faible</SelectItem>
                <SelectItem value="rupture">Ruptures</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <ConfirmDialog
        open={Boolean(action)}
        onOpenChange={(open) => !open && setAction(null)}
        title={action?.mode === 'desactiver' ? 'Désactiver ce médicament ?' : 'Réactiver ce médicament ?'}
        description={
          action?.mode === 'desactiver'
            ? `${action?.medicament?.nom} ne sera plus proposé dans les sélections. Le stock existant est conservé.`
            : `${action?.medicament?.nom} redevient disponible.`
        }
        confirmLabel={action?.mode === 'desactiver' ? 'Désactiver' : 'Réactiver'}
        destructive={action?.mode === 'desactiver'}
        loading={actionLoading}
        onConfirm={confirmerAction}
      />
    </div>
  )
}