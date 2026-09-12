// ===========================================================================
// Carte KPI réutilisable : icône, valeur, libellé, tendance (+/- %).
// Optionnellement cliquable (href) via react-router.
// ===========================================================================
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const tones = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  blue: 'bg-ocean/10 text-ocean',
}

export function StatCard({ title, value, description, icon: Icon, tone = 'primary', trend, href }) {
  const corps = (
    <Card className="group gap-0 py-5 transition-colors hover:border-primary/40">
      <CardContent className="flex items-start justify-between gap-3 px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{title}</p>
          <p className="mt-1.5 truncate text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            tones[tone] || tones.primary,
          )}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
      {typeof trend === 'number' ? (
        <CardContent className="px-5 pt-3">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
              trend >= 0
                ? 'bg-success/15 text-success'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            {trend >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(trend).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
          </span>
          <span className="ml-1.5 text-xs text-muted-foreground">vs hier</span>
        </CardContent>
      ) : null}
    </Card>
  )

  if (href) {
    return (
      <Link to={href} aria-label={title} className="focus-visible:ring-ring block rounded-xl outline-none focus-visible:ring-2">
        {corps}
      </Link>
    )
  }
  return corps
}

export function StatCardSkeleton() {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex items-start justify-between gap-3 px-5">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="size-11 shrink-0 rounded-xl" />
      </CardContent>
    </Card>
  )
}