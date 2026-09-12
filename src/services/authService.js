// ===========================================================================
// Service d'authentification
// ---------------------------------------------------------------------------
// Toute la logique d'accès à Firebase Auth / Firestore liée aux utilisateurs.
// Les fonctions lèvent des erreurs ; les pages les attrapent et les affichent.
// ===========================================================================
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { adminAuth, auth, db } from '../firebase/config'

// ---------------------------------------------------------------------------
// Traduction d'un code d'erreur Firebase Auth en message français lisible.
// ---------------------------------------------------------------------------
export function errAuthMsg(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email ou mot de passe incorrect.'
    case 'auth/account-disabled':
      return 'Ce compte a été désactivé.'
    case 'auth/invalid-email':
      return "L'adresse email est invalide."
    case 'auth/email-already-in-use':
      return 'Un compte existe déjà avec cet email.'
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caractères.'
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.'
    case 'auth/network-request-failed':
      return 'Erreur réseau. Vérifiez votre connexion.'
    case 'auth/invalid-action-code':
      return 'Ce lien de réinitialisation est invalide ou a expiré.'
    default:
      return "Une erreur est survenue. Veuillez réessayer."
  }
}

// ---------------------------------------------------------------------------
// Connexion d'un utilisateur (admin ou pharmacien) sur l'instance principale.
// ---------------------------------------------------------------------------
export async function login(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)

  // Récupération du profil Firestore pour vérifier l'état du compte.
  const profile = await getCurrentUserProfile(userCredential.user.uid)

  // Un compte désactivé (actif: false) ne peut plus se connecter.
  if (profile && profile.actif === false) {
    await signOut(auth)
    const error = new Error('Ce compte a été désactivé.')
    error.code = 'auth/account-disabled'
    throw error
  }

  // Mémorisation de la dernière connexion.
  await updateDoc(doc(db, 'users', userCredential.user.uid), {
    lastLogin: serverTimestamp(),
  })

  return userCredential.user
}

// ---------------------------------------------------------------------------
// Déconnexion des deux instances (principale + secondaire).
// ---------------------------------------------------------------------------
export async function logout() {
  await Promise.all([signOut(auth), signOut(adminAuth)])
}

// ---------------------------------------------------------------------------
// Récupération du profil Firestore d'un utilisateur (doc id = uid Auth).
// ---------------------------------------------------------------------------
export async function getCurrentUserProfile(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? snapshot.data() : null
}

// ---------------------------------------------------------------------------
// Création d'un compte pharmacien par un admin.
// ---------------------------------------------------------------------------
// La création se fait sur l'instance Firestore Auth principale (même pool
// d'utilisateurs) mais via l'instance Auth "secondaire" (adminAuth) afin de
// ne pas déconnecter l'admin qui réalise l'opération.
// ---------------------------------------------------------------------------
export async function createPharmacien({ nom, prenom, email, password }) {
  const adminUser = auth.currentUser
  if (!adminUser) {
    throw new Error('Aucun administrateur connecté.')
  }

  const userCredential = await createUserWithEmailAndPassword(adminAuth, email, password)
  const uid = userCredential.user.uid

  // Création du profil Firestore correspondant.
  await setDoc(doc(db, 'users', uid), {
    uid,
    email: email.trim().toLowerCase(),
    nom: nom.trim(),
    prenom: prenom.trim(),
    role: 'pharmacien',
    actif: true,
    createdAt: serverTimestamp(),
    createdBy: adminUser.uid,
  })

  return userCredential.user
}

// ---------------------------------------------------------------------------
// Désactivation / réactivation d'un compte (réservé à l'admin).
// ---------------------------------------------------------------------------
export async function disableUser(uid) {
  await updateDoc(doc(db, 'users', uid), { actif: false })
}

export async function enableUser(uid) {
  await updateDoc(doc(db, 'users', uid), { actif: true })
}

// ---------------------------------------------------------------------------
// Envoi d'un email de réinitialisation de mot de passe.
// ---------------------------------------------------------------------------
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}