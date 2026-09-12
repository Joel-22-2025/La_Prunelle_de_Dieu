// ===========================================================================
// Carte « Ventes récentes » — tableau sur desktop, liste-cartes sur mobile.
// ===========================================================================
import { Link } from 'react-router-dom'
import { ArrowRight, ReceiptText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/EmptyState'
import { StatutVenteBadge } from '@/components/Badge'

const toDate = (value) => (value && typeof value.toDate === 'function' ? value.toDate() : value)

const heure = (value) => {
  const d = toDate(value)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function RecentSales({ ventes = [] }) {
  return (
    <Card className="gap-0 py-5">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Ventes récentes</CardTitle>
          <CardDescription className="mt-1">Les dernières ventes enregistrées.</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-primary">
          <Link to="/ventes">
            Voir tout <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="px-0">
        {ventes.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Aucune vente"
            description="Les ventes validées apparaîtront ici."
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Référence</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Heure</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventes.map((v) => (
                    <TableRow key={v.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell className="font-medium text-primary">{v.numero}</TableCell>
                      <TableCell>
                        <span className="line-clamp-1 text-muted-foreground">{v.premierProduit || '—'}</span>
                      </TableCell>
                      <TableCell className="line-clamp-1 text-muted-foreground">{v.clientNom}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatMontant(v.montantTotal)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{heure(v.date)}</TableCell>
                      <TableCell>
                        <StatutVenteBadge statut={v.statut} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <ul className="divide-y md:hidden">
              {ventes.map((v) => (
                <li key={v.id} className="px-5 py-3">
                  <Link to={`/ventes/${v.id}`} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-primary">{v.numero}</p>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {v.premierProduit || '—'} · {v.clientNom}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{formatMontant(v.montantTotal)}</p>
                      <p className="text-xs text-muted-foreground">{heure(v.date)}</p>
                    </div>
                  </Link>
                  <div className="mt-1.5">
                    <StatutVenteBadge statut={v.statut} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function RecentSalesSkeleton() {
  return (
    <Card className="gap-0 py-5">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="space-y-3 px-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

function formatMontant(value) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(value) || 0)} F`
}