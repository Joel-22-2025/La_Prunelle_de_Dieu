// ===========================================================================
// Page /factures — LISTE des factures (lecture pour tout actif).
// ===========================================================================
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FileText } from 'lucide-react'
import { getFactures } from '@/services/factureService'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import DataTable from '@/components/DataTable'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { StatutFactureBadge } from '@/components/Badge'
import { formatMontant, formatDateTime } from '@/lib/format'

export default function FacturesListe() {
  const navigate = useNavigate()
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let actif = true
    ;(async () => {
      setLoading(true)
      try {
        const liste = await getFactures({ limitMax: 500 })
        if (actif) setFactures(liste)
      } catch (err) {
        console.error('Erreur de chargement des factures :', err)
        toast.error("Impossible de charger les factures")
      } finally {
        if (actif) setLoading(false)
      }
    })()
    return () => { actif = false }
  }, [])

  const colonnes = [
    {
      key: 'numero',
      header: 'N° facture',
      sortable: true,
      render: (f) => (
        <span className="flex items-center gap-2 font-medium">
          <FileText className="size-4 text-primary" /> {f.numero}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (f) => <span className="whitespace-nowrap text-muted-foreground">{f.date ? formatDateTime(f.date) : '—'}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      render: (f) => {
        const client = f.client
        return client?.nom || <span className="italic text-muted-foreground">Client de passage</span>
      },
    },
    {
      key: 'pharmacienNom',
      header: 'Vendu par',
      render: (f) => <span className="whitespace-nowrap">{f.pharmacienNom || '—'}</span>,
    },
    {
      key: 'montantTotal',
      header: 'Total',
      sortable: true,
      render: (f) => <span className="font-semibold">{formatMontant(f.montantTotal)}</span>,
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (f) => <StatutFactureBadge statut={f.statut} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (f) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/factures/${f.id}`)}>
          <Eye className="size-4" /> Voir
        </Button>
      ),
    },
  ]

  if (loading) return <LoadingSpinner label="Chargement des factures…" />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Consultez, imprimez ou exportez les factures au format PDF."
      />
      <DataTable
        columns={colonnes}
        rows={factures}
        searchKeys={['numero', 'pharmacienNom']}
        searchPlaceholder="Rechercher par numéro ou pharmacien…"
        onRowClick={(f) => navigate(`/factures/${f.id}`)}
      />
    </div>
  )
}