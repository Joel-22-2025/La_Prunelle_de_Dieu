// ===========================================================================
// Page : /admin/stock/mouvements — historique complet des mouvements de stock.
// ---------------------------------------------------------------------------
// Tableau paginé + recherche + filtres (type, médicament) + export CSV.
// Les mouvements sont immuables (création seule, jamais de modification).
// Réservée à l'admin (RoleRoute).
// ===========================================================================
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import DataTable from '@/components/DataTable'
import { TypeMouvementBadge } from '@/components/Badge'
import { getAllMedicaments } from '@/services/medicamentService'
import { getMouvementsStock, LIBELLES_MOTIF } from '@/services/stockService'
import { formatDateTime, formatNombre } from '@/lib/format'

export default function StockMouvements() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [mouvements, setMouvements] = useState([])
  const [medicaments, setMedicaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filtreType, setFiltreType] = useState('tous')
  const [filtreMedicamentId, setFiltreMedicamentId] = useState('tous')

  useEffect(() => {
    let mounted = true
    Promise.all([getMouvementsStock(), getAllMedicaments()])
      .then(([mvt, meds]) => {
        if (!mounted) return
        setMouvements(mvt)
        setMedicaments(meds)
        const preselectedId = searchParams.get('medicamentId')
        if (preselectedId) setFiltreMedicamentId(preselectedId)
      })
      .catch((err) => {
        console.error(err)
        if (mounted) setError(err.message)
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [searchParams])

  const medicamentParId = useMemo(() => {
    const map = {}
    for (const m of medicaments) map[m.id] = m
    return map
  }, [medicaments])

  // Rows enrichies + filtres.
  const rows = useMemo(() => {
    const base = mouvements.map((m) => ({
      ...m,
      medicamentNom: medicamentParId[m.medicamentId]?.nom || '—',
    }))
    return base.filter((m) => {
      if (filtreType !== 'tous' && m.type !== filtreType) return false
      if (filtreMedicamentId !== 'tous' && m.medicamentId !== filtreMedicamentId) return false
      return true
    })
  }, [mouvements, medicamentParId, filtreType, filtreMedicamentId])

  // -------------------------------------------------------------------------
  // Export CSV (BOM UTF-8 pour Excel).
  // -------------------------------------------------------------------------
  const exporterCSV = () => {
    const entete = [
      'Date',
      'Médicament',
      'Type',
      'Motif',
      'Quantité',
      'Avant',
      'Après',
      'Lot',
      'Utilisateur',
    ]
    const lignes = rows.map((m) => [
      formatDateTime(m.date),
      m.medicamentNom,
      m.type,
      LIBELLES_MOTIF[m.motif] || m.motif,
      m.quantite,
      m.quantiteAvant,
      m.quantiteApres,
      m.numeroLot || '',
      m.utilisateurNom || '',
    ])

    const echappement = (cell) => {
      const valeur = String(cell ?? '')
      return /[";\n]/.test(valeur) ? `"${valeur.replace(/"/g, '""')}"` : valeur
    }
    const csv = [entete, ...lignes].map((l) => l.map(echappement).join(';')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mouvements-stock-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (m) => <span className="text-muted-foreground">{formatDateTime(m.date)}</span>,
    },
    {
      key: 'medicamentNom',
      header: 'Médicament',
      sortable: true,
      className: 'min-w-44',
      render: (m) => <span className="font-medium">{m.medicamentNom}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (m) => <TypeMouvementBadge type={m.type} />,
    },
    {
      key: 'motif',
      header: 'Motif',
      render: (m) => LIBELLES_MOTIF[m.motif] || m.motif,
    },
    {
      key: 'quantite',
      header: 'Quantité',
      className: 'text-right',
      render: (m) => <span className="font-semibold">{formatNombre(m.quantite)}</span>,
    },
    {
      key: 'quantiteAvant',
      header: 'Avant',
      className: 'text-right text-muted-foreground',
      render: (m) => formatNombre(m.quantiteAvant),
    },
    {
      key: 'quantiteApres',
      header: 'Après',
      className: 'text-right',
      render: (m) => formatNombre(m.quantiteApres),
    },
    {
      key: 'utilisateurNom',
      header: 'Utilisateur',
      render: (m) => m.utilisateurNom || <span className="text-muted-foreground">—</span>,
    },
  ]

  if (loading) return <LoadingSpinner label="Chargement de l'historique…" />

  if (error) {
    return (
      <EmptyState
        title="Erreur de chargement"
        description={error}
        action={<Button variant="outline" onClick={() => navigate('/admin/stock')}>Retour</Button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historique des mouvements"
        description={`${mouvements.length} mouvement(s) enregistré(s). Les mouvements sont immuables.`}
      >
        <Button variant="outline" onClick={() => navigate('/admin/stock')}>
          <ArrowLeft /> Retour au stock
        </Button>
        <Button variant="outline" onClick={exporterCSV} disabled={rows.length === 0}>
          <Download /> Export CSV
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['medicamentNom']}
        searchPlaceholder="Rechercher par médicament…"
        keyField="id"
        defaultPageSize={25}
        emptyTitle="Aucun mouvement"
        emptyDescription="Aucun mouvement ne correspond à ces critères."
        toolbar={
          <>
            <Select value={filtreType} onValueChange={setFiltreType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les types</SelectItem>
                <SelectItem value="entree">Entrées</SelectItem>
                <SelectItem value="sortie">Sorties</SelectItem>
                <SelectItem value="ajustement">Ajustements</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtreMedicamentId} onValueChange={setFiltreMedicamentId}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les médicaments</SelectItem>
                {medicaments.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  )
}