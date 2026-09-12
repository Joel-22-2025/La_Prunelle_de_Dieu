// ===========================================================================
// Petite carte de marque : « Votre santé, notre priorité ».
// Coordonnées réelles de la pharmacie (PHARMACIE_INFO). Sobre, sans image.
// ===========================================================================
import { HeartPulse, Phone, Pill } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function PharmacyInfo({ pharmacie }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="bg-primary/95 px-6 py-5 text-primary-foreground">
        <div className="flex items-center gap-3">
          <span className="bg-primary-foreground/15 flex size-10 items-center justify-center rounded-full">
            <Pill className="size-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">{pharmacie?.nom || 'Pharmacie Prunelle'}</p>
            <p className="flex items-center gap-1 text-xs text-primary-foreground/80">
              <HeartPulse className="size-3.5" /> Votre santé, notre priorité
            </p>
          </div>
        </div>
      </div>
      <CardContent className="space-y-1.5 px-6 py-4 text-sm">
        <p className="text-muted-foreground">{pharmacie?.adresse || 'Adresse non renseignée'}</p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Phone className="size-3.5" /> {pharmacie?.telephone || 'Non renseigné'}
        </p>
        {pharmacie?.numeroIFU ? (
          <p className="text-xs text-muted-foreground">IFU : {pharmacie.numeroIFU}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function PharmacyInfoSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="bg-muted h-24 animate-pulse" />
      <CardContent className="space-y-2 px-6 py-4">
        <div className="bg-muted h-3.5 w-3/4 animate-pulse rounded" />
        <div className="bg-muted h-3.5 w-1/2 animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}