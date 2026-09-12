// ===========================================================================
// Service Ventes — collection Firestore "ventes" (+ "factures", "compteurs").
// ---------------------------------------------------------------------------
// RG-06 : toute vente validée décrémente automatiquement le stock.
// RG-08 : toute vente est associée à une facture. RG-09 : numéros uniques.
// RG-07 : annulation = admin uniquement, trace conservée.
//
// GARANTIE ATOMICITÉ : la création d'une vente est une SEULE transaction
// Firestore → si une étape échoue (stock insuffisant, etc.), RIEN n'est écrit
// (rollback total).
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
import { db } from '../firebase/config'
import { pharmacieInfo } from './factureService'

// ---------------------------------------------------------------------------
// Constantes métier.
// ---------------------------------------------------------------------------
export const MODES_PAIEMENT = [
  { value: 'especes', label: 'Espèces' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'carte', label: 'Carte' },
  { value: 'autre', label: 'Autre' },
]

const LIBELLES_MODE = Object.fromEntries(MODES_PAIEMENT.map((m) => [m.value, m.label]))
export const libelleModePaiement = (mode) => LIBELLES_MODE[mode] || (mode || '—')

export const STATUTS_VENTE = { validee: 'Validée', annulee: 'Annulée' }

// ---------------------------------------------------------------------------
// Helpers internes.
// ---------------------------------------------------------------------------
const toArray = (snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

const arrondi = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

const zeroPad = (n, size) => String(n).padStart(size, '0')

// ---------------------------------------------------------------------------
// Normalisation + validation des lignes du panier.
// Retourne { lignesFinales, nombreArticles, montantTotal }.
// ---------------------------------------------------------------------------
function validerLesLignes(lignes) {
  // RG-04 : une vente contient au moins un médicament.
  if (!Array.isArray(lignes) || lignes.length === 0) {
    const error = new Error('Le panier est vide : ajoutez au moins un médicament.')
    error.code = 'panier-vide'
    throw error
  }

  const lignesFinales = lignes.map((l) => {
    const quantite = Number(l.quantite)
    if (!Number.isFinite(quantite) || quantite <= 0) {
      const error = new Error(`Quantité invalide pour "${l.medicamentNom || l.medicamentId}".`)
      error.code = 'quantite-invalide'
      throw error
    }
    const prixUnitaire = arrondi(Number(l.prixUnitaire) || 0)
    return {
      medicamentId: l.medicamentId,
      medicamentNom: l.medicamentNom,
      dosage: l.dosage || '',
      prixUnitaire,
      quantite,
      sousTotal: arrondi(prixUnitaire * quantite),
    }
  })

  const nombreArticles = lignesFinales.reduce((sum, l) => sum + l.quantite, 0)
  const montantTotal = arrondi(lignesFinales.reduce((sum, l) => sum + l.sousTotal, 0))

  return { lignesFinales, nombreArticles, montantTotal }
}

// ---------------------------------------------------------------------------
// Numérotation séquentielle ANNUELLE des ventes via "compteurs/<annee>".
// La numérotation des FACTURES est GLOBALE (compteurs/global, 7 chiffres,
// jamais réinitialisée), calculée séparément dans la transaction : les deux
// compteurs sont verrouillés dans la même transaction (unicité garantie).
// ---------------------------------------------------------------------------
function calculerNumeroVente(compteurSnap, annee) {
  const data = compteurSnap.exists() ? compteurSnap.data() : {}
  const numVente = Number(data.dernierNumeroVente ?? 0)
  return {
    numeroVente: `V-${annee}-${zeroPad(numVente + 1, 4)}`,
    prochainNumVente: numVente + 1,
  }
}

// ---------------------------------------------------------------------------
// CREATION D'UNE VENTE (transaction unique, rollback automatique).
// ---------------------------------------------------------------------------
// utilisateur attendu : { uid, nom, role } (depuis le profil connecté).
// client : { id, nom, telephone } | null (null → "Client de passage").
// ---------------------------------------------------------------------------
export async function creerVente({ lignes, modePaiement = 'especes', montantRecu = null, client = null, utilisateur }) {
  if (!utilisateur?.uid || !utilisateur?.nom) {
    throw new Error('Session invalide : impossible d\'identifier le vendeur.')
  }
  if (!MODES_PAIEMENT.some((m) => m.value === modePaiement)) {
    throw new Error('Mode de paiement inconnu.')
  }

  const { lignesFinales, nombreArticles, montantTotal } = validerLesLignes(lignes)

  // RG : espèce → rendu automatique (montantRecu >= total).
  let montantRecuFinal = null
  let renduFinal = null
  if (modePaiement === 'especes') {
    montantRecuFinal = montantRecu === null || montantRecu === '' ? montantTotal : arrondi(Number(montantRecu))
    if (!Number.isFinite(montantRecuFinal) || montantRecuFinal < montantTotal) {
      const error = new Error('Le montant reçu est inférieur au total à payer.')
      error.code = 'montant-insuffisant'
      throw error
    }
    renduFinal = arrondi(montantRecuFinal - montantTotal)
  }

  return runTransaction(db, async (transaction) => {
    const annee = new Date().getFullYear()

    // 1. Verrouille le compteur annuel des ventes ET le compteur global des
    //    factures (un seul client peut incrémenter à la fois).
    const compteurRef = doc(db, 'compteurs', String(annee))
    const compteurSnap = await transaction.get(compteurRef)
    const { numeroVente, prochainNumVente } = calculerNumeroVente(compteurSnap, annee)

    // Numéro de facture GLOBAL sur 7 chiffres (compteurs/global, continue).
    const compteurGlobalRef = doc(db, 'compteurs', 'global')
    const compteurGlobalSnap = await transaction.get(compteurGlobalRef)
    const dernierNumeroFacture = Number(
      compteurGlobalSnap.exists() ? compteurGlobalSnap.data().dernierNumeroFacture ?? 0 : 0,
    )
    const numeroFacture = String(dernierNumeroFacture + 1).padStart(7, '0')

    // 2. Phase LECTURE : prépare le décrément de chaque médicament
    //    (RG-03/RG-05/RG-06). TOUTES LES LECTURES PRÉCÈDENT TOUTES LES
    //    ÉCRITURES (contrainte des transactions Firestore : un transaction.get()
    //    après un transaction.set() fait échouer toute la transaction).
    //    Les quantités sont AGRÉGÉES par médicament : chaque fiche stock n'est
    //    lue qu'UNE fois (l'instantané est figé au début de la transaction,
    //    un produit en double dans le panier doit être consolidé).
    const besoinsParMedicament = new Map()
    for (const ligne of lignesFinales) {
      const besoin = besoinsParMedicament.get(ligne.medicamentId) || {
        quantite: 0,
        nom: ligne.medicamentNom || ligne.medicamentId,
      }
      besoin.quantite += ligne.quantite
      besoinsParMedicament.set(ligne.medicamentId, besoin)
    }

    const decrementsStock = []
    for (const [medicamentId, besoin] of besoinsParMedicament) {
      const stockRef = doc(db, 'stock', medicamentId)
      const stock = await transaction.get(stockRef)
      const quantiteAvant = stock.exists() ? Number(stock.data().quantiteDisponible ?? 0) : 0

      if (quantiteAvant < besoin.quantite) {
        const error = new Error(
          `Stock insuffisant pour "${besoin.nom}" : ${quantiteAvant} disponible(s). ` +
            'Passez par une entrée de stock pour réapprovisionner.',
        )
        error.code = 'stock-insuffisant'
        throw error
      }

      decrementsStock.push({
        medicamentId,
        quantite: besoin.quantite,
        quantiteAvant,
        quantiteApres: quantiteAvant - besoin.quantite,
      })
    }

    // 3. Phase ÉCRITURE : plus aucune lecture après ce point.
    //    Décrémente le stock et journalise un mouvement "sortie" motif "vente"
    //    (RG-12).
    for (const { medicamentId, quantite, quantiteAvant, quantiteApres } of decrementsStock) {
      const stockRef = doc(db, 'stock', medicamentId)
      transaction.set(
        stockRef,
        { quantiteDisponible: quantiteApres, updatedAt: serverTimestamp() },
        { merge: true },
      )
      transaction.set(doc(collection(db, 'mouvementsStock')), {
        medicamentId,
        type: 'sortie',
        motif: 'vente',
        quantite,
        quantiteAvant,
        quantiteApres,
        numeroLot: null,
        dateExpiration: null,
        motifDetail: `Vente ${numeroVente}`,
        date: serverTimestamp(),
        utilisateurId: utilisateur.uid,
        utilisateurNom: utilisateur.nom,
      })
    }

    // 4. Crée la facture (RG-08) et la vente, numéros uniques (RG-09).
    const factureRef = doc(collection(db, 'factures'))
    const venteRef = doc(collection(db, 'ventes'))

    const ventePayload = {
      numero: numeroVente,
      date: serverTimestamp(),
      utilisateurId: utilisateur.uid,
      utilisateurNom: utilisateur.nom,
      utilisateurRole: utilisateur.role,
      clientId: client?.id || null,
      clientNom: client?.nom || null,
      clientTelephone: client?.telephone || null,
      lignes: lignesFinales,
      nombreArticles,
      montantTotal,
      modePaiement,
      montantRecu: montantRecuFinal,
      rendu: renduFinal,
      factureId: factureRef.id,
      factureNumero: numeroFacture,
      statut: 'validee',
      createdAt: serverTimestamp(),
      createdBy: utilisateur.uid,
    }

    const facturePayload = {
      numero: numeroFacture,
      venteId: venteRef.id,
      venteNumero: numeroVente,
      date: serverTimestamp(),
      pharmacie: pharmacieInfo(),
      pharmacienNom: utilisateur.nom,
      pharmacienRole: utilisateur.role,
      pharmacienId: utilisateur.uid,
      client: client ? { nom: client.nom, telephone: client.telephone, adresse: null, email: null } : null,
      lignes: lignesFinales.map((l) => ({
        designation: [l.medicamentNom, l.dosage].filter(Boolean).join(' — '),
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        sousTotal: l.sousTotal,
      })),
      montantTotal,
      modePaiement,
      montantRecu: montantRecuFinal,
      rendu: renduFinal,
      statut: 'payee',
      createdAt: serverTimestamp(),
    }

    transaction.set(factureRef, facturePayload)
    transaction.set(venteRef, ventePayload)

    // 5. Incrémente les compteurs (ventes : annuel, factures : GLOBAL).
    transaction.set(compteurRef, {
      annee,
      dernierNumeroVente: prochainNumVente,
    })
    transaction.set(compteurGlobalRef, {
      dernierNumeroFacture: dernierNumeroFacture + 1,
    })

    return {
      vente: { id: venteRef.id, ...ventePayload },
      facture: { id: factureRef.id, ...facturePayload },
    }
  })
}

// ---------------------------------------------------------------------------
// Lecture.
// ---------------------------------------------------------------------------
export async function getVenteById(id) {
  const snapshot = await getDoc(doc(db, 'ventes', id))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

// Historique des ventes.
//  - pharmacien : ne voit QUE ses propres ventes (requête d'égalité
//    utilisateurId == uid, conforme aux règles Firestore, sans index composé).
//  - admin : toutes les ventes.
// Tri décroissant côté client pour une stabilité entre les deux chemins.
export async function getVentes({ utilisateurId = null, limitMax = 500 } = {}) {
  const q = utilisateurId
    ? query(collection(db, 'ventes'), where('utilisateurId', '==', utilisateurId), limit(limitMax))
    : query(collection(db, 'ventes'), orderBy('date', 'desc'), limit(limitMax))

  return toArray(await getDocs(q)).sort((a, b) => {
    const da = a.date && typeof a.date.toDate === 'function' ? a.date.toDate() : a.date
    const db = b.date && typeof b.date.toDate === 'function' ? b.date.toDate() : b.date
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0)
  })
}

export async function getVentesDuJour(utilisateurId = null) {
  const debut = new Date()
  debut.setHours(0, 0, 0, 0)
  const ventes = await getVentes({ utilisateurId })
  return ventes.filter((v) => v.date && v.date.toDate() >= debut)
}

// ---------------------------------------------------------------------------
// ANNULATION d'une vente (admin uniquement).
// → Remet les quantités en stock (RG-03, RG-06 inversé), journalise un
//   mouvement "entree" motif "annulation" et marque vente + facture "annulée"
//   (trace conservée : RG-07, RG-12).
// ---------------------------------------------------------------------------
export async function annulerVente(venteId, { motif = '', utilisateur }) {
  if (!utilisateur?.uid || utilisateur.role !== 'admin') {
    const error = new Error('Seul un administrateur peut annuler une vente.')
    error.code = 'non-autorise'
    throw error
  }
  if (!venteId) throw new Error('Identifiant de vente manquant.')

  return runTransaction(db, async (transaction) => {
    const venteRef = doc(db, 'ventes', venteId)
    const venteSnap = await transaction.get(venteRef)
    if (!venteSnap.exists()) {
      const error = new Error('Vente introuvable.')
      error.code = 'introuvable'
      throw error
    }

    const vente = venteSnap.data()
    if (vente.statut !== 'validee') {
      const error = new Error('Cette vente a déjà été annulée.')
      error.code = 'deja-annulee'
      throw error
    }

    // Remise en stock + mouvements "entree" (RG-03, RG-06 inversé).
    // TOUTES LES LECTURES PRÉCÈDENT TOUTES LES ÉCRITURES (contrainte des
    // transactions Firestore). Les quantités sont agrégées par médicament.
    const retoursParMedicament = new Map()
    for (const ligne of vente.lignes || []) {
      const retour = retoursParMedicament.get(ligne.medicamentId) || { quantite: 0 }
      retour.quantite += Number(ligne.quantite || 0)
      retoursParMedicament.set(ligne.medicamentId, retour)
    }

    const retours = []
    for (const [medicamentId, retour] of retoursParMedicament) {
      const stockRef = doc(db, 'stock', medicamentId)
      const stock = await transaction.get(stockRef)
      const quantiteAvant = stock.exists() ? Number(stock.data().quantiteDisponible ?? 0) : 0
      retours.push({
        medicamentId,
        quantite: retour.quantite,
        quantiteAvant,
        quantiteApres: quantiteAvant + retour.quantite,
      })
    }

    for (const { medicamentId, quantite, quantiteAvant, quantiteApres } of retours) {
      const stockRef = doc(db, 'stock', medicamentId)
      transaction.set(
        stockRef,
        { quantiteDisponible: quantiteApres, updatedAt: serverTimestamp() },
        { merge: true },
      )
      transaction.set(doc(collection(db, 'mouvementsStock')), {
        medicamentId,
        type: 'entree',
        motif: 'annulation',
        quantite,
        quantiteAvant,
        quantiteApres,
        numeroLot: null,
        dateExpiration: null,
        motifDetail: `Annulation vente ${vente.numero}${motif ? ` — ${motif}` : ''}`,
        date: serverTimestamp(),
        utilisateurId: utilisateur.uid,
        utilisateurNom: utilisateur.nom,
      })
    }

    transaction.update(venteRef, {
      statut: 'annulee',
      motifAnnulation: motif || '',
      annuleParId: utilisateur.uid,
      annuleParNom: utilisateur.nom,
      annuleLe: serverTimestamp(),
    })

    // La facture liée passe à "annulée" (RG-08 / RG-07).
    if (vente.factureId) {
      transaction.update(doc(db, 'factures', vente.factureId), { statut: 'annulee' })
    }

    return { id: venteId, ...vente, statut: 'annulee' }
  })
}