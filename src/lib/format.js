// ===========================================================================
// Helpers de formatage (montants, nombres, dates).
// ===========================================================================

// Formatage d'un montant en FCFA : "4 500 FCFA".
export const formatFCFA = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `${new Intl.NumberFormat('fr-FR').format(Number(value))} FCFA`
}

// Formatage d'un montant en francs (FCFA) : ex "4 500 F".
export function formatMontant(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `${new Intl.NumberFormat('fr-FR').format(Number(value))} F`
}

// Formatage d'un nombre entier (ex: quantité).
export function formatNombre(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('fr-FR').format(Number(value))
}

// Gestion d'un horodatage Firestore (Timestamp) ou d'une Date.
function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  return value instanceof Date ? value : new Date(value)
}

// Date courte "12/09/2026".
export function formatDate(value) {
  const date = toDate(value)
  if (!date || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Date + heure "12/09/2026 14:35".
export function formatDateTime(value) {
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