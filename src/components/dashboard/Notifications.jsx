// ===========================================================================
// Cloche de notifications (header) : alertes de stock en un coup d'œil.
// Données réelles issues de getAlertesStock.
// ===========================================================================
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bell, PackageX } from 'lucide-react'
import { getAlertesStock } from '@/services/stockService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export default function Notifications({ isAdmin }) {
  const [alertes, setAlertes] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let actif = true
    ;(async () => {
      try {
        const { stockFaible, ruptures } = await getAlertesStock()
        if (actif) {
          setAlertes([
            ...ruptures.map((a) => ({ ...a, etat: 'rupture' })),
            ...stockFaible.map((a) => ({ ...a, etat: 'faible' })),
          ].slice(0, 5))
        }
      } catch (err) {
        console.error('Notifications indisponibles :', err)
      } finally {
        if (actif) setChargement(false)
      }
    })()
    return () => { actif = false }
  }, [])

  const total = alertes.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications de stock"
          className="relative"
        >
          <Bell className="size-5" />
          {total > 0 ? (
            <Badge className="bg-destructive absolute -top-0.5 -right-0.5 h-4 min-w-4 items-center justify-center px-1 text-[10px] text-white">
              {total}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Alertes de stock</span>
          {total > 0 ? (
            <Badge variant="secondary">{total}</Badge>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {chargement ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : total === 0 ? (
          <div className="px-3 py-6 text-center">
            <PackageX className="mx-auto mb-2 size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucune alerte de stock.</p>
          </div>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {alertes.map(({ medicament, quantite, etat }) => (
              <li key={medicament.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent/60">
                <span className="min-w-0 flex-1 truncate font-medium">{medicament.nom}</span>
                <span className="shrink-0">
                  <Badge variant={etat === 'rupture' ? 'destructive' : 'default'} className={etat === 'faible' ? 'bg-warning/15 text-warning border-warning/30' : ''}>
                    {etat === 'rupture' ? `Rupture (${quantite})` : `Faible (${quantite})`}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}

        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <div className="p-1">
              <Button asChild variant="ghost" size="sm" className="w-full justify-between">
                <Link to="/admin/stock">
                  Gérer le stock <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}