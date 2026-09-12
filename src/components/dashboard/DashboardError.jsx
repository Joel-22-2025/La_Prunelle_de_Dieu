// ===========================================================================
// État d'erreur du tableau de bord : message + bouton « Réessayer ».
// ===========================================================================
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DashboardError({ message, onRetry }) {
  return (
    <Card className="gap-0 border-destructive/30 bg-destructive/5 py-10">
      <CardContent className="flex flex-col items-center gap-3 text-center">
        <span className="bg-destructive/10 flex size-12 items-center justify-center rounded-full text-destructive">
          <AlertTriangle className="size-6" />
        </span>
        <div>
          <h2 className="font-semibold">Impossible de charger le tableau de bord</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {message || 'Une erreur est survenue lors de la récupération des données.'}
          </p>
        </div>
        <Button onClick={onRetry} variant="outline">
          <RotateCw className="size-4" /> Réessayer
        </Button>
      </CardContent>
    </Card>
  )
}