// ===========================================================================
// Service Factures — collection Firestore "factures" + export PDF.
// ---------------------------------------------------------------------------
// RG-08 : toute vente validée est associée à une facture.
// RG-09 : chaque facture possède un numéro unique.
//   → Numérotation GLOBALE continue sur 7 chiffres (compteurs/global).
//   → NE PAS réinitialiser le compteur annuellement.
//
// Export PDF : jsPDF + jspdf-autotable (ticket 80mm par défaut, A4 sur option).
// En-tête officiel : src/config/pharmacieConfig.js (logo + coordonnées).
// Le rendu PDF doit être IDENTIQUE à la prévisualisation écran.
// ===========================================================================
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config'
import { PHARMACIE_CONFIG } from '@/config/pharmacieConfig'
import {
  formatMontant,
  formatDate,
  formatNumeroFacture,
  libelleModePaiement,
  libelleRole,
} from '@/utils/formatage'

// ---------------------------------------------------------------------------
// Compatibilité : anciennes définitions centralisées vers la config officielle
// (le dashboard et venteService les importent encore via factureService).
// ---------------------------------------------------------------------------
export const PHARMACIE_INFO = PHARMACIE_CONFIG

export function pharmacieInfo() {
  return { ...PHARMACIE_CONFIG }
}

// ---------------------------------------------------------------------------
// Helpers internes.
// ---------------------------------------------------------------------------
const toArray = (snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

// ---------------------------------------------------------------------------
// Lecture.
// ---------------------------------------------------------------------------
export async function getFactureById(id) {
  const snapshot = await getDoc(doc(db, 'factures', id))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function getFactureByVenteId(venteId) {
  const snapshot = await getDocs(query(collection(db, 'factures'), limit(500)))
  const factures = toArray(snapshot)
  return factures.find((f) => f.venteId === venteId) || null
}

// Liste des factures (les plus récentes en premier).
export async function getFactures({ limitMax = 500 } = {}) {
  const q = query(collection(db, 'factures'), orderBy('date', 'desc'), limit(limitMax))
  return toArray(await getDocs(q))
}

// ---------------------------------------------------------------------------
// Prochain numéro de facture (lecture seule du compteur).
// Numérotation GLOBALE continue (compteurs/global), jamais réinitialisée.
// La numérotation définitive se fait DANS la transaction de vente (unicité
// garantie), cette fonction ne sert qu'à l'affichage.
// ---------------------------------------------------------------------------
export async function genererNumeroFacture() {
  const snapshot = await getDoc(doc(db, 'compteurs', 'global'))
  const dernier = snapshot.exists() ? Number(snapshot.data().dernierNumeroFacture ?? 0) : 0
  return String(dernier + 1).padStart(7, '0')
}

// ---------------------------------------------------------------------------
// Chargement du logo vers base64 (jsPDF ne charge pas les images par URL).
// ---------------------------------------------------------------------------
async function chargerLogoBase64() {
  try {
    const res = await fetch(PHARMACIE_CONFIG.logo)
    if (!res.ok) throw new Error('Logo introuvable')
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Export PDF (jsPDF + autotable). formatPDF : "ticket" (80mm) | "a4".
// ---------------------------------------------------------------------------
export async function exporterFacturePDF(facture, { formatPDF = 'ticket' } = {}) {
  if (!facture) throw new Error('Facture introuvable.')

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const c = PHARMACIE_CONFIG
  const lignes = facture.lignes || []
  const client = facture.client
  const isTicket = formatPDF === 'ticket'
  const isEspeces = facture.modePaiement === 'especes'
  const montantRecu = facture.montantRecu ?? null
  const reliquat = facture.rendu ?? null
  const role = facture.pharmacienRole ? ` (${libelleRole(facture.pharmacienRole)})` : ''

  // -------------------------------------------------------------------------
  // Dimensions.
  // -------------------------------------------------------------------------
  const pageWidth = isTicket ? 80 : 210
  const marginX = isTicket ? 5 : 20
  const contentWidth = pageWidth - 2 * marginX

  const hauteurEstimee = (isTicket ? 95 : 120) + lignes.length * 8
  const doc = new jsPDF({ unit: 'mm', format: isTicket ? [pageWidth, hauteurEstimee] : 'a4' })

  const logoBase64 = await chargerLogoBase64()
  let y = 8

  // -------------------------------------------------------------------------
  // En-tête officiel : logo à gauche + coordonnées exactes.
  // -------------------------------------------------------------------------
  const logoSize = isTicket ? 15 : 22
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', marginX, y, logoSize, logoSize)
  }
  const texteX = marginX + logoSize + 4

  const nomLines = doc.splitTextToSize(c.nom, pageWidth - texteX - marginX)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(isTicket ? 9 : 13)
  doc.text(nomLines, texteX, y + (isTicket ? 2 : 3))

  let yy = y + (isTicket ? 2 : 3) + nomLines.length * (isTicket ? 3.4 : 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(isTicket ? 7 : 10)

  const autorisation1 = `Autorisation N° : ${c.autorisation1}`
  doc.text(autorisation1, texteX, yy)
  const prefixW = doc.getTextWidth(`Autorisation N° : `)
  yy += isTicket ? 2.6 : 4
  doc.text(c.autorisation2, texteX + prefixW, yy)
  yy += isTicket ? 2.6 : 4
  doc.text(c.adresse, texteX, yy)
  yy += isTicket ? 2.6 : 4
  doc.text(`Tél : ${c.telephone1} / ${c.telephone2}`, texteX, yy)
  yy += isTicket ? 2.6 : 4
  doc.text(`IFU : ${c.ifu}`, texteX, yy)

  y = Math.max(yy + (isTicket ? 3 : 4), y + logoSize + (isTicket ? 3 : 4))

  // Séparateur.
  doc.setLineWidth(0.3)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 5

  // -------------------------------------------------------------------------
  // Numéro de facture + date.
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(isTicket ? 8.5 : 12)
  doc.text(`TICKETS N°: ${formatNumeroFacture(facture.numero)}`, marginX, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(isTicket ? 7 : 9.5)
  doc.text(`Date: ${formatDate(facture.date)}`, pageWidth - marginX, y, { align: 'right' })
  y += 5

  // -------------------------------------------------------------------------
  // Client + vendeur.
  // -------------------------------------------------------------------------
  doc.setFontSize(isTicket ? 7.5 : 10)
  const clientNom = client ? `${client.nom}${client.telephone ? ` — Tél: ${client.telephone}` : ''}` : 'Client de passage'
  doc.text(`Client: ${clientNom}`, marginX, y)
  y += 4
  doc.text(`Vendu par: ${facture.pharmacienNom || '—'}${role}`, marginX, y)
  y += 5

  // -------------------------------------------------------------------------
  // Tableau des lignes.
  // -------------------------------------------------------------------------
  const estA4 = !isTicket
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [estA4 ? ['Désignation', 'Qté', 'PU (FCFA)', 'Sous-total (FCFA)'] : ['Désignation', 'Qté', 'Total']],
    body: lignes.map((l) =>
      estA4
        ? [l.designation || '—', String(l.quantite), formatMontant(l.prixUnitaire), formatMontant(l.sousTotal)]
        : [l.designation || '—', String(l.quantite), formatMontant(l.sousTotal)],
    ),
    styles: { fontSize: isTicket ? 7 : 9.5, cellPadding: 1.2, halign: 'left', valign: 'middle' },
    headStyles: { fillColor: [5, 39, 74], textColor: 255, fontStyle: 'bold', halign: 'left' },
    columnStyles: estA4
      ? {
          0: { cellWidth: contentWidth * 0.38 },
          1: { cellWidth: contentWidth * 0.12, halign: 'right' },
          2: { cellWidth: contentWidth * 0.24, halign: 'right' },
          3: { cellWidth: contentWidth * 0.26, halign: 'right' },
        }
      : {
          0: { cellWidth: contentWidth * 0.62 },
          1: { cellWidth: contentWidth * 0.13, halign: 'right' },
          2: { cellWidth: contentWidth * 0.25, halign: 'right' },
        },
  })

  y = doc.lastAutoTable.finalY + 6

  // -------------------------------------------------------------------------
  // Totaux (alignés à droite).
  // -------------------------------------------------------------------------
  const droite = (texte, hauteur) => {
    doc.text(texte, pageWidth - marginX, y, { align: 'right' })
    y += hauteur
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(isTicket ? 8.5 : 12)
  droite(`Montant TTC: ${formatMontant(facture.montantTotal)}`, isTicket ? 4.6 : 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(isTicket ? 7.5 : 10)
  droite(`Mode de paiement: ${libelleModePaiement(facture.modePaiement)}`, isTicket ? 4.2 : 5)

  if (isEspeces && montantRecu !== null) {
    droite(`Montant remis: ${formatMontant(montantRecu)}`, isTicket ? 4.2 : 5)
  }
  if (isEspeces && reliquat !== null) {
    droite(`Reliquat: ${formatMontant(reliquat)}`, isTicket ? 4.2 : 5)
  }

  if (facture.statut === 'annulee') {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(isTicket ? 7 : 10)
    doc.setTextColor(220, 38, 38)
    doc.text('FACTURE ANNULÉE', pageWidth / 2, y, { align: 'center' })
    doc.setTextColor(0)
    y += isTicket ? 5 : 7
  }

  // -------------------------------------------------------------------------
  // Message de pied de facture.
  // -------------------------------------------------------------------------
  y += isTicket ? 3 : 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(isTicket ? 7.5 : 10)
  doc.text(c.messagePied, pageWidth / 2, y, { align: 'center' })

  const nomFichier = `${(formatNumeroFacture(facture.numero) || 'facture').replace(/[^\w-]+/g, '_')}.pdf`
  doc.save(nomFichier)
}