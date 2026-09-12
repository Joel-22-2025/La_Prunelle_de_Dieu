// ===========================================================================
// Modal de validation d'une vente — UN SEUL écran (interdiction des wizard).
// Récapitulatif + mode de paiement + montant reçu (rendu auto) + client optionnel.
// Touche Entrée = valider, Échap = annuler.
// ===========================================================================
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SpinnerInButton } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { formatMontant, formatNombre } from '@/lib/format'
import ModePaiementSelector from '@/components/vente/ModePaiementSelector'
import RechercheClient from '@/components/vente/RechercheClient'

const faireNumero = (value) => { const n = Number(value); return n > 0 ? n : null }

export default function ModalValidationVente({
  open,
  onOpenChange,
  total = 0,
  nombreArticles = 0,
  onConfirmed,
  submitting = false,
  erreur = '',
}) {
  const [modePaiement, setModePaiement] = useState('especes')
  const [montantRecu, setMontantRecu] = useState('')
  const [client, setClient] = useState(null)
  const [erreurLocale, setErreurLocale] = useState('')

  // Réinitialisation à chaque ouverture.
  useEffect(() => {
    if (open) {
      setModePaiement('especes')
      setMontantRecu('')
      setClient(null)
      setErreurLocale('')
    }
  }, [open])

  const montantSaisi = faireNumero(montantRecu)
  const isEspeces = modePaiement === 'especes'
  const rendu = isEspeces && montantSaisi !== null ? Math.max(0, montantSaisi - total) : null

  const valider = (event) => {
    event.preventDefault()
    // Garde-fou : ignorer les submit qui remontent d'un formulaire imbriqué
    // (ex. création rapide d'un client) — on ne valide que le submit du
    // formulaire principal de la modale.
    if (event.target !== event.currentTarget) return
    setErreurLocale('')
    if (isEspeces && montantSaisi !== null && montantSaisi < total) {
      setErreurLocale('Le montant reçu est inférieur au total à payer.')
      return
    }
    onConfirmed({
      modePaiement,
      montantRecu: isEspeces ? (montantRecu === '' ? total : montantSaisi) : null,
      client,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* onOpenChange false → frappe d'Échap / clic hors zone = annulation. */}
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Valider la vente</DialogTitle>
          <DialogDescription>
            {formatNombre(nombreArticles)} article(s) pour un total de{' '}
            <span className="font-semibold text-foreground">{formatMontant(total)}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={valider} className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm">Mode de paiement</Label>
            <ModePaiementSelector value={modePaiement} onChange={setModePaiement} />
          </div>

          {isEspeces && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mv-montant" className="text-sm">
                  Montant reçu
                </Label>
                <Input
                  id="mv-montant"
                  inputMode="numeric"
                  autoFocus
                  placeholder={`${formatMontant(total)}`}
                  value={montantRecu}
                  onChange={(e) => setMontantRecu(e.target.value.replace(/[^\d]/g, ''))}
                />
              </div>
              <div>
                <Label htmlFor="mv-rendu" className="text-sm">Rendu</Label>
                <div
                  className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold"
                  aria-live="polite"
                >
                  {rendu === null ? '—' : formatMontant(rendu)}
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div>
            <Label className="mb-2 block text-sm">Client (facultatif)</Label>
            <RechercheClient value={client} onChange={setClient} />
          </div>

          {(erreur || erreurLocale) && (
            <p className="text-sm text-destructive" role="alert">
              {erreurLocale || erreur}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              <SpinnerInButton busy={submitting} />
              Valider la vente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}