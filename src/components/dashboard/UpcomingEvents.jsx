// ===========================================================================
// Carte « Prochaines échéances » — événements de gestion.
// ---------------------------------------------------------------------------
// NOTE : l'application ne possède pas encore de module « échéances ». Les
// dates affichées sont calculées dynamiquement à partir du calendrier réel
// (inventaire mensuel = dernier jour du mois, etc.) pour rester pertinentes.
// À brancher plus tard sur une vraie collection Firestore si besoin.
// ===========================================================================
import { CalendarClock, ShieldCheck, Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const dateFormat = (d) =>
  d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

const joursRestants = (d) => Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

const dernierJourDuMois = (annee, mois) => new Date(annee, mois + 1, 0)

// Calcul des prochaines occurrences.
function calculerEcheances() {
  const now = new Date()
  const annee = now.getFullYear()
  const mois = now.getMonth()

  const inventaire = dernierJourDuMois(annee, mois)
  if (inventaire <= now) inventaire.setMonth(inventaire.getMonth() + 1)

  const maintenance = new Date(now)
  maintenance.setDate(now.getDate() + 15)

  const licence = new Date(now)
  licence.setDate(now.getDate() + 30)

  return [
    {
      id: 'inventaire',
      icon: CalendarClock,
      titre: 'Inventaire mensuel',
      date: inventaire,
      cls: 'bg-primary/10 text-primary',
    },
    {
      id: 'maintenance',
      icon: Wrench,
      titre: 'Maintenance système',
      date: maintenance,
      cls: 'bg-ocean/10 text-ocean',
    },
    {
      id: 'licence',
      icon: ShieldCheck,
      titre: 'Vérification licence',
      date: licence,
      cls: 'bg-warning/15 text-warning',
    },
  ]
}

export default function UpcomingEvents() {
  const evenements = calculerEcheances()

  return (
    <Card className="gap-0 py-5">
      <CardHeader>
        <CardTitle className="text-base">Prochaines échéances</CardTitle>
        <CardDescription className="mt-1">Planification & maintenance.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y">
          {evenements.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-5 py-3">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${e.cls}`}
              >
                <e.icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.titre}</p>
                <p className="text-xs text-muted-foreground">{dateFormat(e.date)}</p>
              </div>
              <span className="bg-muted shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                J-{Math.max(1, joursRestants(e.date))}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function UpcomingEventsSkeleton() {
  return (
    <Card className="gap-0 py-5">
      <CardHeader>
        <Skeleton className="h-5 w-44" />
      </CardHeader>
      <CardContent className="space-y-3 px-5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}