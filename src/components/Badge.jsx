// ===========================================================================
// Badges sémantiques réutilisables : statut d'un médicament, niveau de stock,
// rôle utilisateur, type de mouvement.
// ===========================================================================
import { cn } from '@/lib/utils'

const base =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium'

// Stock : "ok" (vert) / "faible" (orange) / "rupture" (rouge).
export function StockBadge({ quantite, seuil = 0, className }) {
  const isRupture = !quantite || Number(quantite) <= 0
  const isFaible = Number(quantite) <= Number(seuil)

  return (
    <span
      className={cn(
        base,
        isRupture
          ? 'border-destructive/25 bg-destructive/10 text-destructive'
          : isFaible
            ? 'border-warning/25 bg-warning/10 text-warning'
            : 'border-success/25 bg-success/10 text-success',
        className,
      )}
    >
      {isRupture ? 'Rupture' : isFaible ? 'Stock faible' : 'Stock OK'}
    </span>
  )
}

// Statut d'un médicament : actif / inactif.
export function StatutBadge({ statut, className }) {
  const actif = statut === 'actif'
  return (
    <span
      className={cn(
        base,
        actif
          ? 'border-success/25 bg-success/10 text-success'
          : 'border-border bg-muted text-muted-foreground',
        className,
      )}
    >
      {actif ? 'Actif' : 'Inactif'}
    </span>
  )
}

// Rôle utilisateur : admin / pharmacien.
export function RoleBadge({ role, className }) {
  const isAdmin = role === 'admin'
  return (
    <span
      className={cn(
        base,
        isAdmin
          ? 'border-primary/25 bg-primary/10 text-primary'
          : 'border-primary/25 bg-primary/10 text-primary',
        className,
      )}
    >
      {isAdmin ? 'Admin' : 'Pharmacien'}
    </span>
  )
}

// Type de mouvement de stock : entree / sortie / ajustement.
export function TypeMouvementBadge({ type, className }) {
  const map = {
    entree: { label: 'Entrée', cls: 'border-success/25 bg-success/10 text-success' },
    sortie: { label: 'Sortie', cls: 'border-destructive/25 bg-destructive/10 text-destructive' },
    ajustement: { label: 'Ajustement', cls: 'border-primary/25 bg-primary/10 text-primary' },
    annulation: { label: 'Annulation', cls: 'border-warning/25 bg-warning/10 text-warning' },
  }
  const current = map[type] || { label: type, cls: 'border-border bg-muted text-muted-foreground' }
  return <span className={cn(base, current.cls, className)}>{current.label}</span>
}

// Statut d'une vente : validee / annulee.
export function StatutVenteBadge({ statut, className }) {
  const validee = statut === 'validee'
  return (
    <span
      className={cn(
        base,
        validee
          ? 'border-success/25 bg-success/10 text-success'
          : 'border-destructive/25 bg-destructive/10 text-destructive',
        className,
      )}
    >
      {validee ? 'Validée' : 'Annulée'}
    </span>
  )
}

// Statut d'une facture : payee / annulee.
export function StatutFactureBadge({ statut, className }) {
  const payee = statut === 'payee'
  return (
    <span
      className={cn(
        base,
        payee
          ? 'border-success/25 bg-success/10 text-success'
          : 'border-destructive/25 bg-destructive/10 text-destructive',
        className,
      )}
    >
      {payee ? 'Payée' : 'Annulée'}
    </span>
  )
}

// Mode de paiement : especes / mobile_money / carte / autre.
export function ModePaiementBadge({ mode, className }) {
  const map = {
    especes: { label: 'Espèces', cls: 'border-success/25 bg-success/10 text-success' },
    mobile_money: { label: 'Mobile Money', cls: 'border-primary/25 bg-primary/10 text-primary' },
    carte: { label: 'Carte', cls: 'border-ocean/25 bg-ocean/10 text-ocean' },
    autre: { label: 'Autre', cls: 'border-border bg-muted text-muted-foreground' },
  }
  const current = map[mode] || { label: mode || '—', cls: 'border-border bg-muted text-muted-foreground' }
  return <span className={cn(base, current.cls, className)}>{current.label}</span>
}