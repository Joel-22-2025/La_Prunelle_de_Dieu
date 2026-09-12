// ===========================================================================
// Spinner de chargement réutilisable (anneau).
// Prend automatiquement la couleur du texte courant (blanc dans les boutons,
// primary dans les cartes) via currentColor → zéro config au point d'usage.
// ===========================================================================
import { cn } from '@/lib/utils'

const TAILLES = {
  sm: 'size-4 border-2',
  md: 'size-5 border-2',
  lg: 'size-6 border-[3px]',
  xl: 'size-8 border-4',
}

export function Spinner({ size = 'sm', label = 'Chargement', className }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full',
        TAILLES[size],
        className,
      )}
      style={{
        borderColor: 'color-mix(in srgb, currentColor 25%, transparent)',
        borderTopColor: 'currentColor',
      }}
    />
  )
}

// ===========================================================================
// Variante « bouton » : le spinner occupe toujours sa taille (aucun saut de
// mise en page) et n'apparaît que lorsque busy est vrai.
// ===========================================================================
export function SpinnerInButton({ busy, size = 'sm', className }) {
  return (
    <Spinner
      size={size}
      label={busy ? 'Traitement en cours' : 'Inactif'}
      className={cn(
        'transition-opacity duration-200',
        busy ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  )
}

export default Spinner