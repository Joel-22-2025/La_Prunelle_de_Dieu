// ===========================================================================
// Recherche médicament (caisse) : barre + liste de résultats instantanés.
// Les résultats sont fournis par le parent (Vente.jsx) : chaque entrée est
// { medicament, quantiteDisponible } — l'élément est grisé si rupture.
// ===========================================================================
import { Barcode, Pill, ScanLine, ShoppingCart, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatMontant, formatNombre } from '@/lib/format'

export default function RechercheMedicament({
  valeur,
  onChange,
  onEffacer,
  resultats = [],
  inputRef,
  onAjouter,
  onBarcodeSelect,
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Raccourcis : <kbd className="rounded border bg-muted px-1">F1</kbd> ou{' '}
        <kbd className="rounded border bg-muted px-1">/</kbd> recherche ·{' '}
        <kbd className="rounded border bg-muted px-1">Entrée</kbd> ajouter ·{' '}
        <kbd className="rounded border bg-muted px-1">F2</kbd> valider ·{' '}
        <kbd className="rounded border bg-muted px-1">F3</kbd> vider panier
      </p>

      <div className="relative">
        <ScanLine className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAjouter()
            }
          }}
          placeholder="Scanner / taper code-barres, nom ou principe actif…"
          className="h-12 pl-10 pr-9 text-base"
          aria-label="Rechercher un médicament"
        />
        {valeur && (
          <button
            type="button"
            onClick={onEffacer}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Effacer la recherche"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Résultats */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-card">
        {valeur.trim() === '' ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {onBarcodeSelect
              ? 'Scannez un code-barres ou tapez votre recherche.'
              : 'Tapez votre recherche.'}
          </p>
        ) : resultats.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Aucun résultat.</p>
        ) : (
          <ul className="divide-y">
            {resultats.map(({ medicament, quantiteDisponible }) => {
              const rupture = Number(quantiteDisponible ?? 0) <= 0
              return (
                <li key={medicament.id}>
                  <div
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-4 py-3',
                      rupture ? 'opacity-60' : 'transition-colors hover:bg-accent/50',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {medicament.codeBarre ? <Barcode className="size-4" /> : <Pill className="size-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{medicament.nom}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[medicament.dosage, medicament.formePharmaceutique, medicament.principeActif]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                        <span className="mt-0.5 block text-xs">
                          {rupture ? (
                            <span className="font-medium text-destructive">Rupture de stock</span>
                          ) : (
                            <span
                              className={cn(
                                'font-medium',
                                Number(quantiteDisponible) <= Number(medicament.seuilMinimal)
                                  ? 'text-warning'
                                  : 'text-muted-foreground',
                              )}
                            >
                              Stock : {formatNombre(quantiteDisponible)}
                            </span>
                          )}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <Button
                        type="button"
                        size="sm"
                        variant={rupture ? 'outline' : 'default'}
                        disabled={rupture}
                        onClick={() => onAjouter(medicament)}
                        className="gap-1.5 whitespace-nowrap"
                      >
                        <ShoppingCart className="size-4" />
                        Ajouter au panier
                      </Button>
                      <span className="hidden text-sm font-semibold sm:inline">{formatMontant(medicament.prixVente)}</span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}