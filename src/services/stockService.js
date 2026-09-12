// ===========================================================================
// Service Stock — collections Firestore "stock" et "mouvementsStock".
// ---------------------------------------------------------------------------
// Toutes les écritures passent par des TRANSACTIONS pour garantir la
// cohérence : mise à jour de la quantité + création du mouvement = atomique.
// Accessible uniquement aux admins (règles Firestore vérifiées côté serveur).
// ===========================================================================
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { auth, db } from '../firebase/config'

// ---------------------------------------------------------------------------
// Motifs d'entrée / de sortie (énum métier).
// ---------------------------------------------------------------------------
export const MOTIFS_ENTREE = ['reception', 'retour_client', 'autre']
export const MOTIFS_SORTIE = ['perte', 'produit_endommage', 'produit_expire', 'autre']

export const LIBELLES_MOTIF = {
  reception: 'Réception fournisseur',
  retour_client: 'Retour client',
  perte: 'Perte',
  produit_endommage: 'Produit endommagé',
  produit_expire: 'Produit expiré',
  inventaire: 'Inventaire',
  autre: 'Autre',
}

// ---------------------------------------------------------------------------
// Helpers internes.
// ---------------------------------------------------------------------------
const toArray = (snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

// Retourne l'uid de l'utilisateur connecté (côté client).
const utilisateurId = () => auth.currentUser?.uid ?? ''

// Conversion d'une quantité saisie (string) en nombre.
const asNumber = (value) => Number(value)

// ---------------------------------------------------------------------------
// Lecture du stock.
// ---------------------------------------------------------------------------
export async function getStockByMedicamentId(medicamentId) {
  const snapshot = await getDoc(doc(db, 'stock', medicamentId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function getTousLesStocks() {
  const snapshot = await getDocs(collection(db, 'stock'))
  return toArray(snapshot)
}

// ---------------------------------------------------------------------------
// Historique des mouvements.
// Filtres possibles : medicamentId, type, utilisateurId, dateDebut, dateFin.
// ---------------------------------------------------------------------------
export async function getMouvementsStock(filtres = {}) {
  // Requête bornée puis filtres appliqués côté client, pour éviter les index
  // composites Firestore (nécessaires sinon pour where + orderBy).
  const q = query(collection(db, 'mouvementsStock'), orderBy('date', 'desc'), limit(1000))

  let result = toArray(await getDocs(q))

  if (filtres.medicamentId) result = result.filter((m) => m.medicamentId === filtres.medicamentId)
  if (filtres.type) result = result.filter((m) => m.type === filtres.type)
  if (filtres.utilisateurId) result = result.filter((m) => m.utilisateurId === filtres.utilisateurId)

  if (filtres.dateDebut) {
    const debut = new Date(filtres.dateDebut)
    result = result.filter((m) => m.date && m.date.toDate() >= debut)
  }
  if (filtres.dateFin) {
    const fin = new Date(filtres.dateFin)
    result = result.filter((m) => m.date && m.date.toDate() <= fin)
  }

  return result
}

// ---------------------------------------------------------------------------
// Entrée de stock (transaction).
// ---------------------------------------------------------------------------
export async function entreeStock({
  medicamentId,
  quantite,
  motif,
  numeroLot = '',
  dateExpiration = null,
  motifDetail = '',
  utilisateurNom = '',
}) {
  const qte = asNumber(quantite)
  if (!Number.isFinite(qte) || qte <= 0) {
    throw new Error('La quantité doit être un nombre supérieur à 0.')
  }

  return runTransaction(db, async (transaction) => {
    const stockRef = doc(db, 'stock', medicamentId)
    let stock
    try {
      stock = await transaction.get(stockRef)
    } catch {
      stock = null
    }

    const quantiteAvant = stock?.exists() ? asNumber(stock.data().quantiteDisponible ?? 0) : 0
    const quantiteApres = quantiteAvant + qte
    const seuilMinimal = stock?.exists() ? asNumber(stock.data().seuilMinimal ?? 0) : 0

    transaction.set(
      stockRef,
      { medicamentId, quantiteDisponible: quantiteApres, seuilMinimal, updatedAt: serverTimestamp() },
      { merge: true },
    )

    transaction.set(doc(collection(db, 'mouvementsStock')), {
      medicamentId,
      type: 'entree',
      motif,
      quantite: qte,
      quantiteAvant,
      quantiteApres,
      numeroLot: numeroLot || null,
      dateExpiration: dateExpiration || null,
      motifDetail: motifDetail || '',
      date: serverTimestamp(),
      utilisateurId: utilisateurId(),
      utilisateurNom,
    })

    return { quantiteAvant, quantiteApres }
  })
}

// ---------------------------------------------------------------------------
// Sortie de stock (transaction) — interdit si quantité insuffisante.
// ---------------------------------------------------------------------------
export async function sortieStock({
  medicamentId,
  quantite,
  motif,
  motifDetail = '',
  utilisateurNom = '',
}) {
  const qte = asNumber(quantite)
  if (!Number.isFinite(qte) || qte <= 0) {
    throw new Error('La quantité doit être un nombre supérieur à 0.')
  }

  return runTransaction(db, async (transaction) => {
    const stockRef = doc(db, 'stock', medicamentId)
    let stock
    try {
      stock = await transaction.get(stockRef)
    } catch {
      stock = null
    }

    const quantiteAvant = stock?.exists() ? asNumber(stock.data().quantiteDisponible ?? 0) : 0

    if (quantiteAvant < qte) {
      const error = new Error(`Stock insuffisant : ${quantiteAvant} disponible(s).`)
      error.code = 'stock-insuffisant'
      throw error
    }

    const quantiteApres = quantiteAvant - qte

    transaction.set(
      stockRef,
      { medicamentId, quantiteDisponible: quantiteApres, updatedAt: serverTimestamp() },
      { merge: true },
    )

    transaction.set(doc(collection(db, 'mouvementsStock')), {
      medicamentId,
      type: 'sortie',
      motif,
      quantite: qte,
      quantiteAvant,
      quantiteApres,
      numeroLot: null,
      dateExpiration: null,
      motifDetail: motifDetail || '',
      date: serverTimestamp(),
      utilisateurId: utilisateurId(),
      utilisateurNom,
    })

    return { quantiteAvant, quantiteApres }
  })
}

// ---------------------------------------------------------------------------
// Ajustement d'inventaire (transaction).
// Crée un mouvement "ajustement" uniquement si un écart a été constaté.
// ---------------------------------------------------------------------------
export async function ajusterStockInventaire({
  medicamentId,
  quantiteReelle,
  utilisateurNom = '',
}) {
  const qte = asNumber(quantiteReelle)
  if (!Number.isFinite(qte) || qte < 0) {
    throw new Error('La quantité réelle doit être un nombre positif ou nul.')
  }

  return runTransaction(db, async (transaction) => {
    const stockRef = doc(db, 'stock', medicamentId)
    let stock
    try {
      stock = await transaction.get(stockRef)
    } catch {
      stock = null
    }

    const quantiteAvant = stock?.exists() ? asNumber(stock.data().quantiteDisponible ?? 0) : 0
    const seuilMinimal = stock?.exists() ? asNumber(stock.data().seuilMinimal ?? 0) : 0
    const quantiteApres = qte

    transaction.set(
      stockRef,
      { medicamentId, quantiteDisponible: quantiteApres, seuilMinimal, updatedAt: serverTimestamp() },
      { merge: true },
    )

    if (quantiteAvant !== quantiteApres) {
      transaction.set(doc(collection(db, 'mouvementsStock')), {
        medicamentId,
        type: 'ajustement',
        motif: 'inventaire',
        quantite: Math.abs(quantiteApres - quantiteAvant),
        quantiteAvant,
        quantiteApres,
        numeroLot: null,
        dateExpiration: null,
        motifDetail: '',
        date: serverTimestamp(),
        utilisateurId: utilisateurId(),
        utilisateurNom,
      })
    }

    return { quantiteAvant, quantiteApres, ecart: quantiteApres - quantiteAvant }
  })
}

// ---------------------------------------------------------------------------
// Alertes de stock : retourne { stockFaible: [], ruptures: [] }.
// ---------------------------------------------------------------------------
export async function getAlertesStock() {
  const [medicamentsSnap, stocksSnap] = await Promise.all([
    getDocs(query(collection(db, 'medicaments'), where('statut', '==', 'actif'))),
    getDocs(collection(db, 'stock')),
  ])

  const medicaments = toArray(medicamentsSnap)
  const stocks = toArray(stocksSnap)
  const stockDe = (medicamentId) => stocks.find((s) => s.medicamentId === medicamentId)

  const stockFaible = []
  const ruptures = []

  for (const medicament of medicaments) {
    const stockRef = stockDe(medicament.id)
    const quantite = stockRef ? asNumber(stockRef.quantiteDisponible ?? 0) : 0
    const seuil = asNumber(medicament.seuilMinimal ?? 0)

    if (quantite <= 0) {
      ruptures.push({ medicament, quantite, stock: stockRef })
    } else if (quantite <= seuil) {
      stockFaible.push({ medicament, quantite, stock: stockRef })
    }
  }

  return { stockFaible, ruptures }
}