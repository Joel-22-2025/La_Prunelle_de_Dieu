// ===========================================================================
// Service Clients — collection Firestore "clients".
// ---------------------------------------------------------------------------
// Les clients sont SECONDaires dans le processus de vente : facultatif à la
// validation. Règles Firestore : lecture / création / mise à jour pour tout
// utilisateur actif, suppression réservée à l'admin.
// ===========================================================================
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase/config'

// ---------------------------------------------------------------------------
// Helpers internes.
// ---------------------------------------------------------------------------
const toArray = (snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

// ---------------------------------------------------------------------------
// Recherche de clients par nom ou téléphone (limite 10 résultats).
// ---------------------------------------------------------------------------
export async function rechercherClients(terme = '', max = 10) {
  const q = terme.trim().toLowerCase()
  if (!q) return []

  const snapshot = await getDocs(query(collection(db, 'clients'), limit(200)))
  const tous = toArray(snapshot)

  return tous
    .filter(
      (c) =>
        String(c.nom ?? '').toLowerCase().includes(q) ||
        String(c.telephone ?? '').toLowerCase().includes(q),
    )
    .slice(0, max)
}

export async function getClientById(id) {
  const snapshot = await getDoc(doc(db, 'clients', id))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

// ---------------------------------------------------------------------------
// Création d'un client (nom + téléphone obligatoires, le reste optionnel).
// ---------------------------------------------------------------------------
export async function createClient(data) {
  if (!data.nom?.trim()) throw new Error('Le nom du client est obligatoire.')
  if (!data.telephone?.trim()) throw new Error('Le téléphone du client est obligatoire.')

  const payload = {
    nom: data.nom.trim(),
    telephone: data.telephone.trim(),
    adresse: data.adresse?.trim() || null,
    email: data.email?.trim() || null,
    createdAt: serverTimestamp(),
  }

  const ref = doc(collection(db, 'clients'))
  await setDoc(ref, payload)
  return { id: ref.id, ...payload }
}

// ---------------------------------------------------------------------------
// Historique des achats d'un client (50 derniers, les plus récents d'abord).
// - admin : toutes les ventes du client (where clientId == clientId).
// - pharmacien : techniquement restreint aux ventes qu'il a lui-même créées
//   (where utilisateurId == uid, conformes aux règles Firestore) puis filtrées
//   par clientId. Aucun index composé requis.
// ---------------------------------------------------------------------------
export async function getHistoriqueAchats(clientId, utilisateurId = null) {
  if (!clientId) return []

  const q = utilisateurId
    ? query(collection(db, 'ventes'), where('utilisateurId', '==', utilisateurId), limit(500))
    : query(collection(db, 'ventes'), where('clientId', '==', clientId), limit(500))

  return toArray(await getDocs(q))
    .filter((v) => !utilisateurId || v.clientId === clientId)
    .sort((a, b) => {
      const da = a.date && typeof a.date.toDate === 'function' ? a.date.toDate() : a.date
      const db = b.date && typeof b.date.toDate === 'function' ? b.date.toDate() : b.date
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0)
    })
    .slice(0, 50)
}

// ---------------------------------------------------------------------------
// Liste complète des clients (triés par nom) — pour la page /clients.
// ---------------------------------------------------------------------------
export async function getAllClients() {
  const snapshot = await getDocs(query(collection(db, 'clients'), orderBy('nom', 'asc')))
  return toArray(snapshot)
}