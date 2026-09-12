// ===========================================================================
// Carte « Alertes de stock » — produits en rupture ou sous le seuil minimal.
// Statut calculé sur les vraies données (getAlertesStock).
// ===========================================================================
import { Link } from 'react-router-dom'
import { ArrowRight, PackageX } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/EmptyState'

const STATUTS = {
  rupture: { label: 'Rupture', cls: 'border-destructive/25 bg-destructive/10 text-destructive' },
  faible: { label: 'Stock faible', cls: 'border-warning/25 bg-warning/10 text-warning' },
  ok: { label: 'OK', cls: 'border-success/25 bg-success/10 text-success' },
}

function badge(statut) {
  const s = STATUTS[statut]
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  )
}

export default function StockAlerts({ alerts, role }) {
  const ruptures = alerts?.ruptures || []
  const faibles = alerts?.stockFaible || []
  const lignes = [...ruptures.map((a) => ({ ...a, etat: 'rupture' })), ...faibles.map((a) => ({ ...a, etat: 'faible' }))]
  const visibles = lignes.slice(0, 6)
  const totalAlertes = lignes.length

  return (
    <Card className="gap-0 py-5">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Alertes de stock</CardTitle>
          <CardDescription className="mt-1">
            {totalAlertes > 0
              ? `${totalAlertes} produit(s) à surveiller.`
              : 'Tous les niveaux de stock sont corrects.'}
          </CardDescription>
        </div>
        {role === 'admin' && totalAlertes > 0 ? (
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link to="/admin/stock">
              Voir tout <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="px-0">
        {visibles.length === 0 ? (
          <EmptyState
            icon={PackageX}
            title="Aucune alerte"
            description="Aucun produit en rupture ou sous son seuil minimal."
          />
        ) : (
          <ul className="divide-y">
            {visibles.map(({ medicament, quantite, etat }) => (
              <li key={medicament.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium">{medicament.nom}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Seuil minimal : {medicament.seuilMinimal ?? 0} unité(s)
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`text-sm font-semibold ${etat === 'rupture' ? 'text-destructive' : 'text-warning'}`}
                  >
                    {quantite} <span className="font-normal text-muted-foreground">unité(s)</span>
                  </span>
                  {badge(etat)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function StockAlertsSkeleton() {
  return (
    <Card className="gap-0 py-5">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="space-y-3 px-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}