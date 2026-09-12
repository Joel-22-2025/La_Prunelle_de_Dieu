// ===========================================================================
// Aperçu imprimable d'une facture (ticket 80 mm ou A4).
// C'est la seule zone visible à l'impression (voir CSS @media print et la
// page /factures/:id : elle inclut TOUTES les informations de la facture.
// En-tête officiel : <EnteteFacture /> (logo + coordonnées exactes).
// Le rendu doit être IDENTIQUE à l'export PDF (factureService).
// ===========================================================================
import { cn } from '@/lib/utils'
import { PHARMACIE_CONFIG } from '@/config/pharmacieConfig'
import {
  formatMontant,
  formatDate,
  formatNumeroFacture,
  libelleModePaiement,
  libelleRole,
} from '@/utils/formatage'
import EnteteFacture from '@/components/facture/EnteteFacture'

export default function FacturePreview({ facture = null, formatPDF = 'ticket' }) {
  if (!facture) {
    return (
      <div className="rounded-md border bg-card p-10 text-center text-sm text-muted-foreground">
        Facture introuvable.
      </div>
    )
  }

  const isTicket = formatPDF === 'ticket'
  const client = facture.client
  const lignes = facture.lignes || []
  const isEspeces = facture.modePaiement === 'especes'
  const numero = formatNumeroFacture(facture.numero)
  const montantRecu = facture.montantRecu ?? null
  const reliquat = facture.rendu ?? null

  return (
    <div
      className={cn(
        'print-area facture-container mx-auto rounded-md border bg-white p-6 text-foreground shadow-sm',
        isTicket ? 'w-[80mm] text-[11px] leading-snug' : 'w-full max-w-3xl p-10 text-sm leading-relaxed',
      )}
    >
      {/* En-tête officiel (logo + coordonnées). */}
      <EnteteFacture formatPDF={formatPDF} />

      <div className="my-4 border-t border-dashed border-muted-foreground/40" />

      {/* Numéro + date de la facture. */}
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-bold">
          TICKETS N°: <span>{numero}</span>
        </p>
        <p className="whitespace-nowrap text-muted-foreground">Date: {formatDate(facture.date)}</p>
      </div>

      <div className="my-3 space-y-1">
        <p>
          Client: <span className="font-semibold">{client?.nom || 'Client de passage'}</span>
          {client?.telephone ? <span className="text-muted-foreground"> — Tél: {client.telephone}</span> : null}
        </p>
        <p>
          Vendu par: <span className="font-semibold">{facture.pharmacienNom || '—'}</span>
          {facture.pharmacienRole ? (
            <span className="text-muted-foreground"> ({libelleRole(facture.pharmacienRole)})</span>
          ) : null}
        </p>
      </div>

      <div className="my-4 border-t border-dashed border-muted-foreground/40" />

      {/* Tableau des lignes. */}
      <table className="facture-lignes w-full border-collapse">
        <thead>
          <tr className="border-b border-muted-foreground/40 text-left">
            <th className="py-1 pr-2">Désignation</th>
            <th className="py-1 text-right">Qté</th>
            {!isTicket ? (
              <>
                <th className="py-1 text-right">PU (FCFA)</th>
                <th className="py-1 text-right">Sous-total (FCFA)</th>
              </>
            ) : (
              <th className="py-1 text-right">Total</th>
            )}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i} className="border-b border-border">
              <td className="py-1 pr-2">{l.designation || '—'}</td>
              <td className="py-1 text-right">{l.quantite}</td>
              {!isTicket ? (
                <>
                  <td className="py-1 text-right">{formatMontant(l.prixUnitaire)}</td>
                  <td className="py-1 text-right font-medium">{formatMontant(l.sousTotal)}</td>
                </>
              ) : (
                <td className="py-1 text-right font-medium">{formatMontant(l.sousTotal)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-4 border-t border-dashed border-muted-foreground/40" />

      {/* Totaux. */}
      <div className={cn('space-y-1', isTicket ? 'text-right' : 'ml-auto w-full max-w-sm text-left')}>
        <div className="flex justify-between gap-4">
          <span>Montant TTC:</span>
          <span className="font-bold">{formatMontant(facture.montantTotal)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Mode de paiement:</span>
          <span>{libelleModePaiement(facture.modePaiement)}</span>
        </div>
        {isEspeces && montantRecu !== null && montantRecu !== undefined && (
          <div className="flex justify-between gap-4">
            <span>Montant remis:</span>
            <span>{formatMontant(montantRecu)}</span>
          </div>
        )}
        {isEspeces && reliquat !== null && reliquat !== undefined && (
          <div className="flex justify-between gap-4">
            <span>Reliquat:</span>
            <span>{formatMontant(reliquat)}</span>
          </div>
        )}
      </div>

      {facture.statut === 'annulee' && (
        <p className="mt-3 border border-destructive py-1 text-center font-bold text-destructive">FACTURE ANNULÉE</p>
      )}

      <p className="mt-5 text-center font-medium">{PHARMACIE_CONFIG.messagePied}</p>
    </div>
  )
}