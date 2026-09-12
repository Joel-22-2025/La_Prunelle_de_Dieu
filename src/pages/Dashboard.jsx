// ===========================================================================
// Page Tableau de bord (/dashboard)
// ---------------------------------------------------------------------------
// Composée de blocs réutilisables (components/dashboard/*) alimentés par des
// données RÉELLES (Firestore via useDashboardData). Le contenu s'adapte au
// rôle : le pharmacien ne voit que ses propres ventes et n'accède pas aux
// sections d'administration.
// ===========================================================================
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Package, Pill, ReceiptText, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardData } from '@/hooks/useDashboardData'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard'
import SalesChart, { SalesChartSkeleton } from '@/components/dashboard/SalesChart'
import RecentSales, { RecentSalesSkeleton } from '@/components/dashboard/RecentSales'
import StockAlerts, { StockAlertsSkeleton } from '@/components/dashboard/StockAlerts'
import RecentActivities, { RecentActivitiesSkeleton } from '@/components/dashboard/RecentActivities'
import DashboardError from '@/components/dashboard/DashboardError'
import RapportVentesDuJour from '@/components/dashboard/RapportVentesDuJour'
import { formatMontant, formatNombre } from '@/lib/format'

// ---------------------------------------------------------------------------
// Horloge en direct (heure + date du jour).
// ---------------------------------------------------------------------------
function ClockWidget() {
  const [maintenant, setMaintenant] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setMaintenant(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const heure = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date = maintenant.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="off">
      <Clock className="size-4" />
      <time dateTime={maintenant.toISOString()} className="font-medium text-foreground">
        {heure}
      </time>
      <span className="hidden sm:inline">·</span>
      <span className="hidden capitalize sm:inline">{date}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page.
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const { user, profile } = useAuth()

  const role = profile?.role
  const uid = user?.uid
  const enAttenteProfil = !role || !uid

  const { data, loading, error, reload } = useDashboardData({
    role,
    uid,
    actif: !enAttenteProfil,
  })

  const prenom = profile?.prenom || profile?.nom || user?.email
  const roleLabel = role === 'admin' ? 'Administrateur' : 'Pharmacien'
  const isAdmin = role === 'admin'

  if (error) return <DashboardError message={error} onRetry={reload} />

  // Valeurs KPI (chargées).
  const alerteTotale = data ? (data.alerts.stockFaible.length + data.alerts.ruptures.length) : 0
  const trend = data ? (data.caHier > 0 ? ((data.caJour - data.caHier) / data.caHier) * 100 : null) : null

  return (
    <div className="space-y-6">
      {/* ----- Bandeau d'accueil ----- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {prenom}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Activité de la pharmacie à l'instant —
            <span className="font-medium text-foreground"> {roleLabel}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ClockWidget />
          {isAdmin && <RapportVentesDuJour />}
          <Button asChild>
            <Link to="/vente">
              <ReceiptText className="size-4" /> Nouvelle vente
            </Link>
          </Button>
        </div>
      </div>

      {/* ----- KPI ----- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!data ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Médicaments"
              value={formatNombre(data.medicamentsCount)}
              description={`${formatNombre(data.medicamentsTotal)} références au total`}
              icon={Pill}
              tone="primary"
              href={isAdmin ? '/admin/medicaments' : undefined}
            />
            <StatCard
              title="Stock disponible"
              value={formatNombre(data.totalStock)}
              description={`${formatNombre(data.nbStocks)} produits en stock`}
              icon={Package}
              tone="blue"
              href={isAdmin ? '/admin/stock' : undefined}
            />
            <StatCard
              title="Alertes de stock"
              value={formatNombre(alerteTotale)}
              description={
                alerteTotale > 0
                  ? `${data.alerts.ruptures.length} rupture(s), ${data.alerts.stockFaible.length} stock(s) faible(s)`
                  : 'Aucun produit à surveiller'
              }
              icon={TrendingUp}
              tone={alerteTotale > 0 ? 'warning' : 'success'}
              href={isAdmin ? '/admin/stock' : undefined}
            />
            <StatCard
              title="Ventes du jour"
              value={formatMontant(data.caJour)}
              description={`${formatNombre(data.nbVentesJour)} vente(s) validée(s)`}
              icon={ReceiptText}
              tone="success"
              trend={trend}
              href="/ventes"
            />
          </>
        )}
      </div>

      {/* ----- Graphique des ventes ----- */}
      {!data ? <SalesChartSkeleton /> : <SalesChart charts={data.charts} />}

      {/* ----- Ventes récentes + alertes ----- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {!data ? (
          <RecentSalesSkeleton />
        ) : (
          <div className="lg:col-span-2">
            <RecentSales ventes={data.recentSales} />
          </div>
        )}
        {!data ? <StockAlertsSkeleton /> : <StockAlerts alerts={data.alerts} role={role} />}
      </div>

      {/* ----- Activités récentes ----- */}
      {!data ? (
        <RecentActivitiesSkeleton />
      ) : (
        <RecentActivities activites={data.activites} medicamentNoms={data.medicamentNoms} />
      )}

      {/* Squelette de précaution si le profil n'est pas encore résolu */}
      {enAttenteProfil && !loading ? (
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-10 w-1/2" />
        </div>
      ) : null}
    </div>
  )
}