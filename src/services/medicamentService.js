// ===========================================================================
// Service Médicaments — collection Firestore "medicaments".
// ---------------------------------------------------------------------------
// Rappel sécurité : les règles Firestore limitent déjà l'accès aux admins,
// ces fonctions sont donc utilisables uniquement depuis des pages admin.
// ===========================================================================
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { getTousLesStocks } from './stockService'

// ---------------------------------------------------------------------------
// Constantes métier (énums locaux).
// ---------------------------------------------------------------------------
export const CATEGORIES = [
  'analgésique',
  'antibiotique',
  'anti-inflammatoire',
  'cardiologie',
  'dermatologie',
  'digestif',
  'respiratoire',
  'vitamines',
  'autre',
]

export const FORMES_PHARMACEUTIQUES = [
  'comprimé',
  'gélule',
  'sirop',
  'injection',
  'pommade',
  'suspension buvable',
  'solution',
  'autre',
]

// Champs pris en compte par la recherche (nom, code-barres, principe actif, catégorie).
export const CHAMPS_RECHERCHE = ['nom', 'codeBarre', 'principeActif', 'categorie']

// ---------------------------------------------------------------------------
// Helpers internes.
// ---------------------------------------------------------------------------
const toArray = (snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

// ---------------------------------------------------------------------------
// Lecture.
// ---------------------------------------------------------------------------
export async function getAllMedicaments() {
  const q = query(collection(db, 'medicaments'), orderBy('nom', 'asc'))
  return toArray(await getDocs(q))
}

export async function getMedicamentById(id) {
  const snapshot = await getDoc(doc(db, 'medicaments', id))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

// Recherche par terme (client-side, adaptée à des catalogues de taille modérée).
export function rechercherMedicaments(liste = [], terme = '') {
  const q = terme.trim().toLowerCase()
  if (!q) return liste
  return liste.filter((m) =>
    CHAMPS_RECHERCHE.some((champ) =>
      String(m[champ] ?? '').toLowerCase().includes(q),
    ),
  )
}

// ---------------------------------------------------------------------------
// Écriture (admin uniquement — vérifié aussi par les règles Firestore).
// ---------------------------------------------------------------------------
export async function createMedicament(data, adminUid) {
  if (!adminUid) {
    throw new Error('Un administrateur doit être connecté pour créer un médicament.')
  }

  const payload = {
    nom: data.nom.trim(),
    formePharmaceutique: data.formePharmaceutique,
    dosage: data.dosage?.trim() ?? '',
    principeActif: data.principeActif?.trim() ?? '',
    categorie: data.categorie,
    codeBarre: data.codeBarre?.trim() || null,
    prixAchat: Number(data.prixAchat),
    prixVente: Number(data.prixVente),
    seuilMinimal: Number(data.seuilMinimal),
    statut: 'actif',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: adminUid,
  }

  const ref = doc(collection(db, 'medicaments'))
  await setDoc(ref, payload)
  return { id: ref.id, ...payload }
}

export async function updateMedicament(id, data) {
  const payload = {
    nom: data.nom.trim(),
    formePharmaceutique: data.formePharmaceutique,
    dosage: data.dosage?.trim() ?? '',
    principeActif: data.principeActif?.trim() ?? '',
    categorie: data.categorie,
    codeBarre: data.codeBarre?.trim() || null,
    prixAchat: Number(data.prixAchat),
    prixVente: Number(data.prixVente),
    seuilMinimal: Number(data.seuilMinimal),
    updatedAt: serverTimestamp(),
  }

  await updateDoc(doc(db, 'medicaments', id), payload)
  return { id, ...payload }
}

// Désactivation / réactivation (jamais de suppression définitive).
export async function desactiverMedicament(id) {
  await updateDoc(doc(db, 'medicaments', id), {
    statut: 'inactif',
    updatedAt: serverTimestamp(),
  })
}

export async function reactiverMedicament(id) {
  await updateDoc(doc(db, 'medicaments', id), {
    statut: 'actif',
    updatedAt: serverTimestamp(),
  })
}

// ---------------------------------------------------------------------------
// Alertes de stock (jointure médicaments <-> stock côté client).
// ---------------------------------------------------------------------------
export async function getMedicamentsStockFaible() {
  const [medicaments, stocks] = await Promise.all([getAllMedicaments(), getTousLesStocks()])
  return medicaments.filter((m) => {
    if (m.statut !== 'actif') return false
    const stock = stocks.find((s) => s.medicamentId === m.id)
    const quantite = stock ? Number(stock.quantiteDisponible ?? 0) : 0
    return quantite > 0 && quantite <= Number(m.seuilMinimal ?? 0)
  })
}

export async function getMedicamentsRupture() {
  const [medicaments, stocks] = await Promise.all([getAllMedicaments(), getTousLesStocks()])
  return medicaments.filter((m) => {
    if (m.statut !== 'actif') return false
    const stock = stocks.find((s) => s.medicamentId === m.id)
    const quantite = stock ? Number(stock.quantiteDisponible ?? 0) : 0
    return quantite <= 0
  })
}