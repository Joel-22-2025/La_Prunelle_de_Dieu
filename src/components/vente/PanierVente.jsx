// ===========================================================================
// Panier de vente (colonne droite de la caisse) : lignes éditables, total
// instantané, sélection par ligne (clavier : +/- qty, Suppr ligne, ↑ ↓ déplacer).
// ===========================================================================
import { MousePointerClick, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatMontant, formatNombre } from '@/lib/format'

export default function PanierVente({
  lignes = [],
  total = 0,
  nombreArticles = 0,
  selectedIndex = -1,
  onSelectIndex,
  onQtyChange,
  onRemove,
  onValider,
  onVider,
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Panier ({formatNombre(nombreArticles)} article(s))</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onVider} disabled={lignes.length === 0}>
          Vider
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-card">
        {lignes.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Panier vide. Ajoutez un produit depuis la recherche.
          </p>
        ) : (
          <ul className="divide-y">
            {lignes.map((ligne, index) => (
              <li
                key={ligne.medicament.id}
                onMouseDown={() => onSelectIndex(index)}
                className={cn(
                  'px-3 py-2.5 transition-colors',
                  index === selectedIndex ? 'bg-accent/60' : 'hover:bg-muted/40',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ligne.medicament.nom}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatMontant(ligne.medicament.prixVente)} × {formatNombre(ligne.quantite)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {formatMontant(ligne.medicament.prixVente * ligne.quantite)}
                  </p>
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex items-center rounded-md border">
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onQtyChange(index, ligne.quantite - 1)}
                      className="px-2 py-1 text-sm hover:bg-accent disabled:opacity-40"
                      disabled={ligne.quantite <= 1}
                      aria-label="Diminuer la quantité"
                    >
                      −
                    </button>
                    <Input
                      value={ligne.quantite}
                      onChange={(e) => onQtyChange(index, Number(e.target.value.replace(/[^\d]/g, '') || 0))}
                      onMouseDown={(e) => e.stopPropagation()}
                      inputMode="numeric"
                      className="h-7 w-12 rounded-none border-0 text-center text-sm"
                      aria-label="Quantité"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onQtyChange(index, ligne.quantite + 1)}
                      className="px-2 py-1 text-sm hover:bg-accent"
                      aria-label="Augmenter la quantité"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => onRemove(index)}
                    className="ml-auto rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Supprimer la ligne"
                    title="Supprimer (touche Suppr)"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Total + validation */}
      <div className="rounded-md border bg-card p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-bold">{formatMontant(total)}</span>
        </div>
        <div className="mt-2 flex gap-2">
          <Button type="button" size="lg" className="flex-1" onClick={onValider} disabled={lignes.length === 0}>
            VALIDER — F2
          </Button>
        </div>
        {selectedIndex >= 0 && (
          <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
            <MousePointerClick className="size-3" />
            Ligne sélectionnée : <b className="text-foreground">+</b>/<b className="text-foreground">−</b> quantité ·{' '}
            <b className="text-foreground">Suppr</b> supprimer · <b className="text-foreground">↑</b>/
            <b className="text-foreground">↓</b> naviguer
          </p>
        )}
      </div>
    </div>
  )
}