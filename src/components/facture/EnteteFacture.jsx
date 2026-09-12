// ===========================================================================
// En-tête officiel de la facture : logo + coordonnées exactes de la
// structure. Rendu identique à l'écran (FacturePreview) et en PDF.
// ===========================================================================
import { PHARMACIE_CONFIG } from '@/config/pharmacieConfig'
import { cn } from '@/lib/utils'

export default function EnteteFacture({ formatPDF = 'ticket' }) {
  const isTicket = formatPDF === 'ticket'
  const c = PHARMACIE_CONFIG

  return (
    <div className={cn('flex items-center', isTicket ? 'gap-2' : 'gap-4')}>
      <img
        src={c.logo}
        alt="Logo de la structure"
        className={cn(
          'size-20 shrink-0 object-contain',
          isTicket && 'size-[15mm]',
        )}
      />

      <div className={cn('min-w-0 flex-1', isTicket ? 'text-[7px] leading-snug' : 'text-sm leading-relaxed')}>
        <p className={cn('font-bold', isTicket ? 'text-[9px]' : 'text-xl')}>{c.nom}</p>
        <p className={isTicket ? 'font-semibold' : 'font-medium'}>
          Autorisation N° : {c.autorisation1}
        </p>
        <p className={isTicket ? 'pl-[18ch]' : 'pl-[18ch]'}>{c.autorisation2}</p>
        <p>{c.adresse}</p>
        <p>
          Tél : {c.telephone1} / {c.telephone2}
        </p>
        <p>IFU : {c.ifu}</p>
      </div>
    </div>
  )
}