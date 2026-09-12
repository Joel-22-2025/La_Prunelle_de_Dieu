// ===========================================================================
// Service Rapports — export PDF des états de gestion.
// ---------------------------------------------------------------------------
// ExporterRapportVentesDuJour : rapport A4 des ventes validées du jour pour
// un pharmacien (synthèse + détail des ventes + récapitulatif par produit).
// Le logo et les coordonnées proviennent de src/config/pharmacieConfig.js
// (source unique), le rendu partage l'esprit visuel de la facture PDF.
// ===========================================================================
import {
  formatMontant,
  formatDate,
  libelleModePaiement,
  libelleRole,
} from '@/utils/formatage'
import { PHARMACIE_CONFIG } from '@/config/pharmacieConfig'

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

const toDate = (value) => (value && typeof value.toDate === 'function' ? value.toDate() : value)

const heureDe = (value) => {
  const d = toDate(value)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ---------------------------------------------------------------------------
// RAPPORT JOURNALIER DES VENTES (A4).
// ---------------------------------------------------------------------------
// parametres :
//   - pharmacien : { nomComplet, role }
//   - ventes     : liste des ventes du jour (déjà filtrées, statut 'validee').
//   - date       : Date du jour de référence.
// ---------------------------------------------------------------------------
export async function exporterRapportVentesDuJour({ pharmacien, ventes = [], date = new Date() }) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const c = PHARMACIE_CONFIG
  const validees = ventes.filter((v) => v.statut === 'validee')
  const totalCA = validees.reduce((s, v) => s + (Number(v.montantTotal) || 0), 0)
  const totalArticles = validees.reduce((s, v) => s + (Number(v.nombreArticles) || 0), 0)

  // Répartition par mode de paiement.
  const parMode = {}
  for (const v of validees) {
    const mode = libelleModePaiement(v.modePaiement)
    parMode[mode] = (parMode[mode] || 0) + (Number(v.montantTotal) || 0)
  }

  // Récapitulatif par produit.
  const produits = {}
  for (const v of validees) {
    for (const l of v.lignes || []) {
      const cle = [l.medicamentNom, l.dosage].filter(Boolean).join(' — ') || l.medicamentNom || '—'
      if (!produits[cle]) produits[cle] = { quantite: 0, montant: 0 }
      produits[cle].quantite += Number(l.quantite) || 0
      produits[cle].montant += Number(l.sousTotal) || 0
    }
  }
  const produitsTable = Object.entries(produits).sort((a, b) => b[1].montant - a[1].montant)

  const pageWidth = 210
  const marginX = 20
  const contentWidth = pageWidth - 2 * marginX

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logoBase64 = await chargerLogoBase64()
  let y = 8

  // -------------------------------------------------------------------------
  // En-tête officiel (logo + coordonnées exactes).
  // -------------------------------------------------------------------------
  const logoSize = 22
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', marginX, y, logoSize, logoSize)
  }
  const texteX = marginX + logoSize + 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  const nomLines = doc.splitTextToSize(c.nom, pageWidth - texteX - marginX)
  doc.text(nomLines, texteX, y + 3)

  let yy = y + 3 + nomLines.length * 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Autorisation N° : ${c.autorisation1}`, texteX, yy)
  const prefixW = doc.getTextWidth('Autorisation N° : ')
  yy += 4
  doc.text(c.autorisation2, texteX + prefixW, yy)
  yy += 4
  doc.text(c.adresse, texteX, yy)
  yy += 4
  doc.text(`Tél : ${c.telephone1} / ${c.telephone2}`, texteX, yy)
  yy += 4
  doc.text(`IFU : ${c.ifu}`, texteX, yy)

  y = Math.max(yy + 4, y + logoSize + 4)

  doc.setLineWidth(0.3)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 9

  // -------------------------------------------------------------------------
  // Titre + contexte.
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('RAPPORT JOURNALIER DES VENTES', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Pharmacien : ${pharmacien?.nomComplet || '—'}${pharmacien?.role ? ` (${libelleRole(pharmacien.role)})` : ''}`, marginX, y)
  y += 5
  doc.text(`Jour concerné : ${date.toLocaleDateString('fr-FR')}`, marginX, y)
  y += 5
  doc.text(`Généré le : ${formatDate(new Date())}`, marginX, y)
  y += 6

  // -------------------------------------------------------------------------
  // Synthèse.
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Synthèse', marginX, y)
  y += 3

  const synthese = [
    `Nombre de ventes validées : ${validees.length}`,
    `Articles vendus : ${totalArticles}`,
    `Montant total (CA) : ${formatMontant(totalCA)}`,
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  for (const ligne of synthese) {
    doc.text(ligne, marginX, y)
    y += 5
  }

  if (validees.length > 0) {
    doc.text('Répartition par mode de paiement :', marginX, y)
    y += 5
    doc.setFontSize(9.5)
    for (const [mode, montant] of Object.entries(parMode)) {
      doc.text(`- ${mode} : ${formatMontant(montant)}`, marginX + 4, y)
      y += 4.6
    }
  }
  y += 4

  // -------------------------------------------------------------------------
  // Détail des ventes.
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Détail des ventes', marginX, y)
  y += 2

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['N° vente', 'Heure', 'Client', 'Mode', 'Montant']],
    body: validees.map((v) => [
      v.numero || '—',
      heureDe(v.date),
      v.clientNom || 'Client de passage',
      libelleModePaiement(v.modePaiement),
      formatMontant(v.montantTotal),
    ]),
    styles: { fontSize: 9, cellPadding: 1.8, halign: 'left', valign: 'middle' },
    headStyles: { fillColor: [5, 39, 74], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.22 },
      1: { cellWidth: contentWidth * 0.12 },
      2: { cellWidth: contentWidth * 0.34 },
      3: { cellWidth: contentWidth * 0.16 },
      4: { cellWidth: contentWidth * 0.16, halign: 'right' },
    },
  })

  y = doc.lastAutoTable.finalY + 8

  // -------------------------------------------------------------------------
  // Récapitulatif par produit.
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Récapitulatif par produit', marginX, y)
  y += 2

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Produit', 'Quantité', 'Montant']],
    body: produitsTable.map(([nom, { quantite, montant }]) => [
      nom,
      String(quantite),
      formatMontant(montant),
    ]),
    styles: { fontSize: 9, cellPadding: 1.8, halign: 'left', valign: 'middle' },
    headStyles: { fillColor: [5, 39, 74], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.6 },
      1: { cellWidth: contentWidth * 0.15, halign: 'right' },
      2: { cellWidth: contentWidth * 0.25, halign: 'right' },
    },
  })

  y = doc.lastAutoTable.finalY + 12

  // -------------------------------------------------------------------------
  // Pied de page.
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(c.messagePied, pageWidth / 2, y, { align: 'center' })

  const nomPharmacien = (pharmacien?.nomComplet || 'pharmacien').replace(/[^\w-]+/g, '_')
  const nomFichier = `Rapport_ventes_du_jour_${date.toLocaleDateString('fr-CA')}_${nomPharmacien}.pdf`
  doc.save(nomFichier)
}