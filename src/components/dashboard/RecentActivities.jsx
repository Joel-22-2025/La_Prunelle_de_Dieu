// ===========================================================================
// Carte « Activités récentes » — ventes + mouvements de stock, avec heure.
// ===========================================================================
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ReceiptText,
  Scale,
  History,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/EmptyState'
import { cn } from '@/lib/utils'

const toDate = (value) => (value && typeof value.toDate === 'function' ? value.toDate() : value)

const heure = (value) => {
  const d = toDate(value)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function configurer(activite, noms) {
  const nom = noms?.[activite.medicamentId]

  if (activite.kind === 'vente') {
    return {
      icon: ReceiptText,
      titre: 'Vente effectuée',
      detail: activite.detail,
      cls: 'bg-primary/10 text-primary',
    }
  }

  if (activite.type === 'entree') {
    return {
      icon: ArrowDownToLine,
      titre: 'Entrée de stock',
      detail: `${nom || 'Médicament'} · ${activite.quantite} unité(s)`,
      cls: 'bg-success/15 text-success',
    }
  }

  if (activite.type === 'sortie') {
    const vente = activite.motif === 'vente'
    return {
      icon: ArrowUpFromLine,
      titre: vente ? 'Sortie (vente)' : 'Sortie de stock',
      detail: `${nom || 'Médicament'} · ${activite.quantite} unité(s)${activite.detail ? ` — ${activite.detail}` : ''}`,
      cls: vente ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive',
    }
  }

  return {
    icon: Scale,
    titre: 'Ajustement (inventaire)',
    detail: `${nom || 'Médicament'} · ${activite.quantite} unité(s)`,
    cls: 'bg-ocean/10 text-ocean',
  }
}

export default function RecentActivities({ activites = [], medicamentNoms = {} }) {
  return (
    <Card className="gap-0 py-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-muted-foreground" /> Activités récentes
        </CardTitle>
        <CardDescription className="mt-1">Derniers événements de l'officine.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {activites.length === 0 ? (
          <EmptyState
            icon={History}
            title="Aucune activité"
            description="Les dernières ventes et mouvements de stock apparaîtront ici."
          />
        ) : (
          <ul className="divide-y">
            {activites.map((a, i) => {
              const { icon: Icon, titre, detail, cls } = configurer(a, medicamentNoms)
              return (
                <li key={i} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full',
                      cls,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{titre}</p>
                    <p className="truncate text-xs text-muted-foreground">{detail}</p>
                    {a.utilisateurNom ? (
                      <p className="text-xs text-muted-foreground/80">
                        Par {a.utilisateurNom}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {heure(a.date)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function RecentActivitiesSkeleton() {
  return (
    <Card className="gap-0 py-5">
      <CardHeader>
        <Skeleton className="h-5 w-44" />
      </CardHeader>
      <CardContent className="space-y-3 px-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}