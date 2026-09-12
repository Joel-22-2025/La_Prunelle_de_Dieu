// ===========================================================================
// Page : /admin/stock — vue d'ensemble des stocks.
// ---------------------------------------------------------------------------
// KPI (total références, quantité totale, stock faible, ruptures), tableau
// filtrable (tous / stock faible / ruptures) et raccourcis vers les pages
// d'entrée, de sortie et d'inventaire. Réservée à l'admin.
// ===========================================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Boxes,
  CircleMinus,
  CirclePlus,
  ClipboardList,
  PackageSearch,
  TriangleAlert,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import StatCard from '@/components/StatCard'
import { StockBadge } from '@/components/Badge'
import { getAllMedicaments } from '@/services/medicamentService'
import { getTousLesStocks } from '@/services/stockService'
import { formatFCFA, formatNombre } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function StockOverview() {
  const navigate = useNavigate()

  const [medicaments, setMedicaments] = useState([])
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtreStock, setFiltreStock] = useState('tous')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [meds, stockList] = await Promise.all([getAllMedicaments(), getTousLesStocks()])
      setMedicaments(meds)
      setStocks(stockList)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Lignes enrichies (uniquement les médicaments actifs).
  const rows = useMemo(() => {
    return medicaments
      .filter((m) => m.statut === 'actif')
      .map((m) => {
        const stock = stocks.find((s) => s.medicamentId === m.id)
        const quantite = stock ? Number(stock.quantiteDisponible ?? 0) : 0
        const seuil = Number(m.seuilMinimal ?? 0)
        return { ...m, quantite, seuil, stock }
      })
  }, [medicaments, stocks])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filtreStock === 'faible' && r.quantite > 0 && r.quantite > r.seuil) return false
      if (filtreStock === 'rupture' && r.quantite > 0) return false
      if (filtreStock === 'ok' && r.quantite <= r.seuil) return false
      return true
    })
  }, [rows, filtreStock])

  // KPIs.
  const quantiteTotale = rows.reduce((acc, r) => acc + r.quantite, 0)
  const stockFaibleCount = rows.filter((r) => r.quantite > 0 && r.quantite <= r.seuil).length
  const rupturesCount = rows.filter((r) => r.quantite <= 0).length

  if (loading) return <LoadingSpinner label="Chargement des stocks…" />

  if (error) {
    return (
      <EmptyState
        icon={Boxes}
        title="Erreur de chargement"
        description={error}
        action={<Button variant="outline" onClick={load}>Réessayer</Button>}
      />
    )
  }

  const filtres = [
    { key: 'tous', label: 'Tous', count: rows.length },
    { key: 'faible', label: 'Stock faible', count: stockFaibleCount },
    { key: 'rupture', label: 'Ruptures', count: rupturesCount },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des stocks"
        description="Vue d'ensemble des quantités disponibles et alertes."
      >
        <Button onClick={() => navigate('/admin/stock/entree')} size="sm">
          <CirclePlus /> Entrée
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin/stock/sortie')} size="sm">
          <CircleMinus /> Sortie
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin/stock/inventaire')} size="sm">
          <ClipboardList /> Inventaire
        </Button>
        <Button variant="link" size="sm" onClick={() => navigate('/admin/stock/mouvements')}>
          Voir l'historique
        </Button>
      </PageHeader>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={PackageSearch} label="Références actives" value={formatNombre(rows.length)} />
        <StatCard icon={Boxes} label="Quantité totale" value={formatNombre(quantiteTotale)} tone="blue" />
        <StatCard icon={TriangleAlert} label="Stock faible" value={formatNombre(stockFaibleCount)} tone="orange" />
        <StatCard icon={CircleMinus} label="Ruptures" value={formatNombre(rupturesCount)} tone="red" />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {filtres.map((f) => (
          <Button
            key={f.key}
            variant={filtreStock === f.key ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setFiltreStock(f.key)}
          >
            {f.label}
            <span
              className={cn(
                'inline-flex size-5 items-center justify-center rounded-full text-xs font-semibold',
                filtreStock === f.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {f.count}
            </span>
          </Button>
        ))}
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Aucun médicament"
          description="Aucun médicament ne correspond aux filtres sélectionnés."
          action={
            <Button variant="outline" onClick={() => navigate('/admin/medicaments/nouveau')}>
              Ajouter un médicament
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Médicament</th>
                <th className="px-4 py-3 text-right">Quantité</th>
                <th className="px-4 py-3 text-right">Seuil</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Marge</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.nom}</p>
                    <p className="text-xs text-muted-foreground">{r.dosage || '—'} · {r.categorie}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatNombre(r.quantite)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatNombre(r.seuil)}</td>
                  <td className="px-4 py-3">
                    <StockBadge quantite={r.quantite} seuil={r.seuil} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatFCFA(r.prixVente - r.prixAchat)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-success hover:text-success"
                        onClick={() => navigate(`/admin/stock/entree?medicamentId=${r.id}`)}
                      >
                        + Entrée
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-destructive hover:text-destructive"
                        onClick={() => navigate(`/admin/stock/sortie?medicamentId=${r.id}`)}
                      >
                        − Sortie
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/stock/inventaire?medicamentId=${r.id}`)}
                      >
                        Inventaire
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}