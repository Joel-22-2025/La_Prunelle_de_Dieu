// ===========================================================================
// Service ESC/POS — impression thermique des tickets de facture.
// ---------------------------------------------------------------------------
// Génère un flux de commandes ESC/POS (standard des imprimantes thermiques)
// et l'envoie à l'imprimante via WebUSB puis, à défaut, Web Serial (Chrome /
// Edge, contexte sécurisé). Format compact type ticket de pharmacie,
// largeurs supportées : 57 mm (32 colonnes) et 80 mm (48 colonnes).
// ===========================================================================
import { PHARMACIE_CONFIG } from '@/config/pharmacieConfig'

// ---------------------------------------------------------------------------
// Petits helpers.
// ---------------------------------------------------------------------------
const formatNombre = (valeur) =>
  new Intl.NumberFormat('fr-FR').format(Number(valeur) || 0)

const toDate = (valeur) =>
  valeur && typeof valeur.toDate === 'function' ? valeur.toDate() : valeur

function dateHeure(valeur) {
  const d = toDate(valeur)
  if (!d || Number.isNaN(d.getTime())) return '…'
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Aplatit les accents et ligatures françaises en ASCII pur : l'ESC/POS ne
// gère pas l'UTF-8. Résultat identique sur toutes les imprimantes.
// Les caractères spéciaux sont écrits en échappements pour éviter tout souci
// d'encodage du fichier source.
const LIGATURES = {
  '\u0153': 'oe', '\u0152': 'OE', '\u00e6': 'ae', '\u00c6': 'AE', '\u20ac': 'EUR', '\u00df': 'ss',
  '\u2014': '-', '\u2013': '-', '\u2026': '...',
}
const plierTexte = (texte) =>
  String(texte ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0153\u0152\u00e6\u00c6\u20ac\u00df\u2014\u2013\u2026\u2019\u2018\u201c\u201d]/g, (c) => LIGATURES[c] || "'")

// ---------------------------------------------------------------------------
// Détection du support d'impression thermique dans le navigateur.
// ---------------------------------------------------------------------------
export const supportWebUSB = () =>
  typeof navigator !== 'undefined' && Boolean(navigator.usb)

export const supportWebSerial = () =>
  typeof navigator !== 'undefined' && Boolean(navigator.serial)

export const supportThermique = () => supportWebUSB() || supportWebSerial()

// ---------------------------------------------------------------------------
// Logo → raster 1-bit (ESCPOS GS v 0). Largueur exprimée en pixels.
// ---------------------------------------------------------------------------
function genererRasterLogo(largeurPixels, octetsParLigne) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const echelle = largeurPixels / img.width
        const w = Math.round(img.width * echelle)
        const h = Math.round(img.height * echelle)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        const pixels = ctx.getImageData(0, 0, w, h).data

        const octetsReels = Math.ceil(w / 8)
        const raster = new Uint8Array(octetsReels * h)
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const idx = (y * w + x) * 4
            const alpha = pixels[idx + 3]
            const luma = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]
            const noir = alpha > 128 && luma < 170
            if (noir) {
              raster[y * octetsReels + Math.floor(x / 8)] |= 0x80 >> (x % 8)
            }
          }
        }

        // Centrage sur la largeur du bandeau (octetsParLigne = colonnes).
        const gauche = Math.max(0, Math.floor((octetsParLigne - octetsReels) / 2))
        const droite = octetsParLigne - octetsReels - gauche
        const final = new Uint8Array(octetsParLigne * h)
        for (let y = 0; y < h; y += 1) {
          final.set(raster.subarray(y * octetsReels, y * octetsReels + octetsReels), y * octetsParLigne + gauche)
        }

        resolve({ octets: final, hauteur: h, octetsParLigne, largeurReelle: w, octetsGauche: gauche, octetsDroite: droite })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = PHARMACIE_CONFIG.logo
  })
}

// ---------------------------------------------------------------------------
// CONSTRUCTION DU TICKET ESC/POS.
// ---------------------------------------------------------------------------
// retour : { octets: Uint8Array } prêt à l'envoi.
// ---------------------------------------------------------------------------
export async function construireTicketESCPOS(facture, { largeur = 80 } = {}) {
  const colonnes = largeur === 57 ? 32 : 48
  const out = []
  const push = (...valeurs) => out.push(...valeurs)

  const texte = (s) => {
    for (const c of plierTexte(s)) push(c.charCodeAt(0))
  }

  const ligne = (s, { align = 0, bold = false, taille = 0 } = {}) => {
    push(0x1b, 0x61, align) // ESC a n : alignement
    push(0x1b, 0x45, bold ? 1 : 0) // ESC E n : gras
    push(0x1d, 0x21, taille) // GS ! n : taille (0, 0x10 = double hauteur)
    texte(s)
    push(0x0a)
  }

  // Émet le raster du logo (centre), sinon les coordonnées en toutes lettres.
  if (supportThermique() && typeof document !== 'undefined') {
    const largeurPixels = largeur === 57 ? 152 : 192
    const raster = await genererRasterLogo(largeurPixels, colonnes)
    if (raster) {
      // Centrage par octets déjà intégré dans raster.octets.
      push(0x1d, 0x76, 0x30, 0) // GS v 0 m=0
      push(raster.octetsParLigne & 0xff, (raster.octetsParLigne >> 8) & 0xff)
      push(raster.hauteur & 0xff, (raster.hauteur >> 8) & 0xff)
      out.push(...raster.octets)
      push(0x0a)
    }
  }

  const c = PHARMACIE_CONFIG

  // En-tête officiel : raison sociale en évidence (double hauteur).
  for (const part of plierTexte(c.nom).match(/.{1,34}/g) || []) {
    ligne(part, { align: 1, bold: true, taille: 0x10 })
  }
  ligne(plierTexte(`Autorisation N° : ${c.autorisation1}`), { align: 1 })
  ligne(plierTexte(c.autorisation2), { align: 1 })
  ligne(plierTexte(c.adresse), { align: 1 })
  ligne(plierTexte(`Tél : ${c.telephone1} / ${c.telephone2}`), { align: 1 })
  ligne(plierTexte(`IFU : ${c.ifu}`), { align: 1 })

  const trait = () => ligne('-'.repeat(colonnes))
  trait()

  // Numéro de facture + date (même ligne si possible, sinon empilés).
  const numero = plierTexte(`TICKETS N°: ${facture.numero || '—'}`)
  const date = `Date: ${dateHeure(facture.date)}`
  if (colonnes === 48) {
    const espace = Math.max(2, colonnes - numero.length - date.length)
    ligne(numero + ' '.repeat(espace) + date, { bold: true })
  } else {
    ligne(numero, { bold: true })
    ligne(date)
  }

  // Client + vendeur.
  const client = facture.client
  const clientNom = client
    ? `${client.nom || ''}${client.telephone ? ` — Tél: ${client.telephone}` : ''}`
    : 'Client de passage'
  ligne(plierTexte(`Client: ${clientNom}`))
  const role = facture.pharmacienRole ? ` (${facture.pharmacienRole === 'admin' ? 'Administrateur' : 'Pharmacien'})` : ''
  ligne(plierTexte(`Vendu par: ${facture.pharmacienNom || '—'}${role}`))

  trait()

  // Lignes d'articles : "xN libellé ......... montant".
  const items = facture.lignes || []
  ligne('QT\u00c9  LIBELL\u00c9' + ' '.repeat(Math.max(2, colonnes - 24)) + 'MONTANT', { bold: true })
  for (const l of items) {
    const montant = formatNombre(l.sousTotal)
    const prefixe = `${Number(l.quantite) || 1} x `
    const nom = plierTexte(l.designation || l.medicamentNom || '—')
    const nomMax = Math.max(8, colonnes - prefixe.length - montant.length - 2)
    const tronque = nom.length > nomMax ? `${nom.slice(0, nomMax - 1)}…` : nom
    const espace = Math.max(1, colonnes - prefixe.length - tronque.length - montant.length)
    ligne(' ' + prefixe + tronque + ' '.repeat(espace) + montant)
  }

  trait()

  // Totaux (alignés à droite).
  const droite = (label, valeur) => {
    const s = `${label}${valeur}`
    ligne(' '.repeat(Math.max(1, colonnes - s.length)) + s)
  }
  ligne('TOTAL' + ' '.repeat(Math.max(1, colonnes - 12)) + `${formatNombre(facture.montantTotal)} FCFA`, { bold: true, taille: 0x10 })
  droite('Mode: ', plierTexte(facture.modePaiement || '—'))
  if (facture.modePaiement === 'especes' && facture.montantRecu != null) {
    droite('Montant remis: ', `${formatNombre(facture.montantRecu)} FCFA`)
  }
  if (facture.modePaiement === 'especes' && facture.rendu != null) {
    droite('Reliquat: ', `${formatNombre(facture.rendu)} FCFA`)
  }

  if (facture.statut === 'annulee') {
    ligne('')
    ligne('FACTURE ANNUL\u00c9E', { align: 1, bold: true })
    ligne('')
  }

  // Pied de facture.
  ligne('')
  ligne(plierTexte(c.messagePied), { align: 1 })
  ligne(plierTexte('Merci de votre visite !'), { align: 1 })

  // Avance papier + coupe.
  out.push(0x0a, 0x0a, 0x0a)
  out.push(0x1d, 0x56, 0x42, 0x00) // GS V B 0 : avance et coupe (partielle)

  return { octets: Uint8Array.from(out), colonnes }
}

// ---------------------------------------------------------------------------
// Transports : WebUSB puis Web Serial.
// ---------------------------------------------------------------------------
async function envoyerWebUSB(octets) {
  if (!supportWebUSB()) throw new Error('WebUSB non disponible (Chrome/Edge requis).')
  const device = await navigator.usb.requestDevice({ filters: [] })
  await device.open()
  try {
    if (!device.configuration && device.configurations.length > 0) {
      await device.selectConfiguration(device.configurations[0].configurationValue)
    }
    const interface_ = device.configuration?.interfaces?.[0]
    if (!interface_) throw new Error('Aucune interface USB trouvée sur l\'imprimante.')
    await device.claimInterface(interface_.interfaceNumber)

    let endpoint = null
    for (const alternative of interface_.alternates) {
      endpoint =
        alternative.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk') ||
        alternative.endpoints.find((e) => e.direction === 'out')
      if (endpoint) break
    }
    if (!endpoint) throw new Error('Aucun point de sortie (bulk/interrupt) sur l\'imprimante.')

    const taille = 512
    for (let i = 0; i < octets.length; i += taille) {
      await device.transferOut(endpoint.endpointNumber, octets.subarray(i, i + taille))
    }
  } finally {
    await device.close()
  }
}

async function envoyerWebSerial(octets) {
  if (!supportWebSerial()) throw new Error('Web Serial non disponible (Chrome requis).')
  const port = await navigator.serial.requestPort()
  await port.open({ baudRate: 9600 })
  try {
    const writer = port.writable.getWriter()
    await writer.write(octets)
    writer.releaseLock()
  } finally {
    await port.close()
  }
}

// ---------------------------------------------------------------------------
// Point d'entrée : construire + imprimer le ticket.
// ---------------------------------------------------------------------------
export async function imprimerTicketThermique(facture, { largeur = 80 } = {}) {
  if (!facture) throw new Error('Facture introuvable.')

  const { octets } = await construireTicketESCPOS(facture, { largeur })

  if (supportWebUSB()) {
    await envoyerWebUSB(octets)
    return 'usb'
  }
  if (supportWebSerial()) {
    await envoyerWebSerial(octets)
    return 'serial'
  }
  const error = new Error(
    'Aucun support ESC/POS. Utilisez un navigateur récent (Chrome/Edge, en HTTPS) et connectez l\'imprimante thermique en USB, ou passez par « Imprimante système ».',
  )
  error.code = 'escpos-indisponible'
  throw error
}