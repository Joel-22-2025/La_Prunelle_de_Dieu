// ===========================================================================
// Modal d'annulation de vente (admin uniquement, RG-07).
// Demande un motif (facultatif) + confirmation.
// ===========================================================================
import { useEffect, useState } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { SpinnerInButton } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

export default function ModalAnnulationVente({
  open,
  onOpenChange,
  vente = null,
  loading = false,
  onConfirm,
}) {
  const [motif, setMotif] = useState('')

  useEffect(() => {
    if (open) setMotif('')
  }, [open])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler la vente {vente?.numero || ''} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Les quantités vendues seront remises en stock et la vente (ainsi que sa facture)
            passera au statut <b>Annulée</b>. Cette action est tracée et réservée aux
            administrateurs.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div>
          <label htmlFor="av-motif" className="text-sm font-medium">
            Motif (facultatif)
          </label>
          <Textarea
            id="av-motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Erreur de saisie, retour client…"
            rows={2}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={loading}>Retour</Button>
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(motif)}
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={loading}
          >
            <SpinnerInButton busy={loading} />
            Annuler la vente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}