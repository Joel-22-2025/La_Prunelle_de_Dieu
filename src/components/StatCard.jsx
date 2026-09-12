// ===========================================================================
// Carte KPI : icône + valeur + label + couleur (utilisée sur les tableaux
// de bord / vues d'ensemble).
// ===========================================================================
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const tones = {
  default: 'bg-primary/10 text-primary',
  green: 'bg-success/10 text-success',
  orange: 'bg-warning/10 text-warning',
  red: 'bg-destructive/10 text-destructive',
  blue: 'bg-primary/10 text-primary',
}

export default function StatCard({ icon: Icon, label, value, tone = 'default', hint }) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="flex items-center gap-4 px-5">
        <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tones[tone] || tones.default)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-bold text-foreground">{value}</p>
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}