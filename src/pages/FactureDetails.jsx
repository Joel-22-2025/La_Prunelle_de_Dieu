// ===========================================================================
// Page /factures/:id — DÉTAIL + impression + export.
// ---------------------------------------------------------------------------
// - "Imprimer ticket" : ESC/POS vers l'imprimante thermique (57/80 mm) via
//   WebUSB ou Web Serial (Chrome/Edge, HTTPS). Layout compact type ticket.
// - "Imprimante système" : window.print(), le CSS @media print ne laisse que
//   la facture (utile en secours ou avec une imprimante classique).
// - "Télécharger PDF" : jsPDF + autotable (80 mm ou A4 selon la bascule).
// - Toggles : PDF 80 mm/A4 et largeur du ticket thermique 57 mm/80 mm.
// - ?print=1 (post-vente) : imprime via ESC/POS si supporté, sinon navigateur.
// ===========================================================================
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, Printer, ReceiptText } from 'lucide-react'
import { getFactureById, exporterFacturePDF } from '@/services/factureService'
import { imprimerTicketThermique, supportThermique } from '@/services/escposService'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { SpinnerInButton } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import FacturePreview from '@/components/facture/FacturePreview'
import { cn } from '@/lib/utils'

export default function FactureDetails() {
  const navigate = useNavigate()
  const { id: factureId } = useParams()
  const [searchParams] = useSearchParams()

  const [facture, setFacture] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formatPDF, setFormatPDF] = useState('ticket')
  const [formatThermique, setFormatThermique] = useState('80')
  const [exportation, setExportation] = useState(false)
  const [impressionThermique, setImpressionThermique] = useState(false)

  useEffect(() => {
    let actif = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await getFactureById(factureId)
        if (actif) setFacture(data)
      } catch (err) {
        console.error('Erreur de chargement de la facture :', err)
      } finally {
        if (actif) setLoading(false)
      }
    })()
    return () => { actif = false }
  }, [factureId])

  // Impression automatique si on arrive avec ?print=1 (post-vente) :
  // ESC/POS si la plateforme le supporte, sinon dialogue du navigateur.
  useEffect(() => {
    if (!loading && facture && searchParams.get('print') === '1') {
      const delai = setTimeout(async () => {
        if (supportThermique()) {
          try {
            await imprimerTicketThermique(facture, { largeur: Number(formatThermique) })
            toast.success('Ticket thermique imprimé')
            return
          } catch (err) {
            console.error('Impression thermique automatique impossible :', err)
            toast.error('Impression thermique impossible', { description: err.message })
          }
        }
        window.print()
      }, 400)
      return () => clearTimeout(delai)
    }
    return undefined
  }, [loading, facture, searchParams, formatThermique])

  const imprimerTicket = async () => {
    if (!facture) return
    setImpressionThermique(true)
    try {
      const methode = await imprimerTicketThermique(facture, { largeur: Number(formatThermique) })
      toast.success("Ticket envoyé à l'imprimante", {
        description: methode === 'usb' ? 'Connexion USB (WebUSB).' : 'Connexion série (Web Serial).',
      })
    } catch (err) {
      console.error("Erreur d'impression du ticket :", err)
      toast.error("Impression du ticket impossible", { description: err.message })
    } finally {
      setImpressionThermique(false)
    }
  }

  const telechargerPDF = async () => {
    if (!facture) return
    setExportation(true)
    try {
      await exporterFacturePDF(facture, { formatPDF })
      toast.success('PDF généré', { description: `${facture.numero}.pdf téléchargé.` })
    } catch (err) {
      toast.error('Export impossible', { description: err.message })
    } finally {
      setExportation(false)
    }
  }

  const naviguerVersVente = facture?.venteId ? `/ventes/${facture.venteId}` : null

  if (loading) return <LoadingSpinner label="Chargement de la facture…" />

  return (
    <div>
      {/* Zone non imprimée (barre d'actions) */}
      <div className="no-print mb-6 space-y-6">
        <PageHeader
          title={`Facture ${facture?.numero || '—'}`}
          description="Prévisualisation, impression et export PDF."
        >
          <Button variant="outline" onClick={() => navigate('/factures')}>
            <ArrowLeft className="size-4" /> Retour
          </Button>
          {naviguerVersVente && (
            <Button variant="outline" onClick={() => navigate(naviguerVersVente)}>
              <ReceiptText className="size-4" /> Voir la vente
            </Button>
          )}
        </PageHeader>

        {/* Bascule PDF 80 mm / A4 + ticket thermique */}
        <div className="flex flex-wrap items-center justify-center gap-1 rounded-lg border bg-card p-1">
          <button
            type="button"
            onClick={() => setFormatPDF('ticket')}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              formatPDF === 'ticket' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            Ticket 80 mm
          </button>
          <button
            type="button"
            onClick={() => setFormatPDF('a4')}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              formatPDF === 'a4' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            Format A4
          </button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <span className="flex items-stretch overflow-hidden rounded-md border">
            {['57', '80'].map((largeur) => (
              <button
                key={largeur}
                type="button"
                onClick={() => setFormatThermique(largeur)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  formatThermique === largeur ? 'bg-ocean text-white' : 'hover:bg-accent',
                )}
              >
                {largeur} mm
              </button>
            ))}
          </span>

          <Button size="sm" onClick={imprimerTicket} disabled={impressionThermique || !facture}>
            <Printer className={`size-4 transition-opacity ${impressionThermique ? 'opacity-0' : 'opacity-100'}`} />
            <SpinnerInButton busy={impressionThermique} />
            Imprimer ticket
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="mx-1">
            Imprimante système
          </Button>
          <Button size="sm" onClick={telechargerPDF} disabled={exportation}>
            <Download className={`size-4 transition-opacity ${exportation ? 'opacity-0' : 'opacity-100'}`} />
            <SpinnerInButton busy={exportation} />
            Télécharger PDF
          </Button>
        </div>

        {facture && (
          <p className="text-center text-xs text-muted-foreground">
            {facture.numero} — PDF {formatPDF === 'ticket' ? '80 mm' : 'A4'} · ticket thermique {formatThermique} mm
            {!supportThermique() && ' · ESC/POS indisponible ici (WebUSB/Serial nécessitent Chrome/Edge en HTTPS) : utilisez « Imprimante système » ou le PDF 80 mm.'}
          </p>
        )}
      </div>

      {/* Zone imprimée */}
      <FacturePreview facture={facture} formatPDF={formatPDF} />
    </div>
  )
}