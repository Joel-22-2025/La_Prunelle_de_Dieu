// ===========================================================================
// Carte « Actions rapides » — raccourcis selon le rôle connecté.
// Toutes les routes ciblées existent réellement dans l'application.
// ===========================================================================
import { Link } from 'react-router-dom'
import {
  FileText,
  PackagePlus,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function QuickActions({ role }) {
  const isAdmin = role === 'admin'

  const actions = [
    {
      to: '/vente',
      label: 'Nouvelle vente',
      description: 'Caisse & encaissement',
      icon: ReceiptText,
      variant: 'default',
    },
    ...(isAdmin
      ? [
          {
            to: '/admin/medicaments/nouveau',
            label: 'Ajouter un médicament',
            description: 'Nouveau produit',
            icon: Plus,
            variant: 'outline',
          },
          {
            to: '/admin/stock/entree',
            label: 'Entrée de stock',
            description: 'Réception fournisseur',
            icon: PackagePlus,
            variant: 'outline',
          },
          {
            to: '/admin/utilisateurs',
            label: 'Gérer les utilisateurs',
            description: 'Comptes & rôles',
            icon: ShieldCheck,
            variant: 'outline',
          },
        ]
      : [
          {
            to: '/ventes',
            label: 'Historique des ventes',
            description: 'Suivi & détail',
            icon: ShoppingCart,
            variant: 'outline',
          },
        ]),
    {
      to: '/factures',
      label: 'Factures',
      description: 'Consulter & imprimer',
      icon: FileText,
      variant: 'outline',
    },
    {
      to: '/clients',
      label: 'Clients',
      description: 'Fiches & historiques',
      icon: Users,
      variant: 'outline',
    },
  ]

  return (
    <Card className="gap-0 py-5">
      <CardHeader>
        <CardTitle className="text-base">Actions rapides</CardTitle>
        <CardDescription className="mt-1">Tâches fréquentes de l'officine.</CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <div className="grid gap-2 sm:grid-cols-2">
          {actions.map((a) => (
            <Button key={`${a.to}-${a.label}`} asChild variant={a.variant} className="h-auto justify-start gap-3 py-2.5">
              <Link to={a.to}>
                <span className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-lg text-primary">
                  <a.icon className="size-4" />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-medium">{a.label}</span>
                  <span className="block text-xs text-muted-foreground">{a.description}</span>
                </span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickActionsSkeleton() {
  return (
    <Card className="gap-0 py-5">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="grid gap-2 px-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}