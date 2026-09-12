// ===========================================================================
// Sélecteur de mode de paiement (boutons radio stylés).
// "Espèces" est présélectionné par défaut (rapidité de caisse).
// ===========================================================================
import { MODES_PAIEMENT } from '@/services/venteService'
import { cn } from '@/lib/utils'

export default function ModePaiementSelector({ value = 'especes', onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MODES_PAIEMENT.map((mode) => {
        const selected = value === mode.value
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                : 'border-border bg-card hover:bg-accent',
            )}
            aria-pressed={selected}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}