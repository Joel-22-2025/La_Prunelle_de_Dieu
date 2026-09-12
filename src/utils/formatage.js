// ===========================================================================
// Helpers de formatage dédiés à la facturation.
// ---------------------------------------------------------------------------
// - formatMontant      : "5 500 FCFA" (espace comme séparateur de milliers).
// - formatNombre       : "5 500".
// - formatDate         : "12/09/2026 14:32" (JJ/MM/AAAA HH:MM).
// - formatNumeroFacture: "0001080" (7 chiffres, zéros à gauche).
// - libelleModePaiement: traduit le mode stocké en libellé facture.
// ===========================================================================

// Gestion d'un horodatage Firestore (Timestamp) ou d'une Date.
function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  return value instanceof Date ? value : new Date(value)
}

// Nombre avec séparateur de milliers (espace insécable fr-FR) : "5 500".
export function formatNombre(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('fr-FR').format(Number(value))
}

// Montant en FCFA : "5 500 FCFA".
export function formatMontant(value, { devise = 'FCFA' } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `${formatNombre(value)} ${devise}`
}

// Date + heure au format JJ/MM/AAAA HH:MM : "12/09/2026 14:32".
export function formatDate(value) {
  const date = toDate(value)
  if (!date || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Numéro de facture séquentiel sur 7 chiffres : "0001080".
// Tolérant aux anciens formats ("F-2026-0001") : extrait le dernier nombre.
export function formatNumeroFacture(value) {
  if (value === null || value === undefined || value === '') return '—'
  const matches = String(value).match(/\d+/g)
  const nombre = matches ? Number(matches[matches.length - 1]) : Number(value)
  if (!Number.isFinite(nombre) || nombre <= 0) return String(value)
  return String(nombre).padStart(7, '0')
}

// Traduction du mode de paiement stocké.
export function libelleModePaiement(mode) {
  const map = {
    especes: 'Espèces',
    mobile_money: 'Mobile Money',
    carte: 'Carte bancaire',
    autre: 'Autre',
  }
  return map[mode] || (mode || '—')
}

// Libellé du rôle du vendeur.
export function libelleRole(role) {
  return role === 'admin' ? 'Administrateur' : 'Pharmacien'
}