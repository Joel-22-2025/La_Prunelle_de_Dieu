// ===========================================================================
// Service d'authentification
// ---------------------------------------------------------------------------
// Toute la logique d'accès à Firebase Auth / Firestore liée aux utilisateurs.
// Les fonctions lèvent des erreurs ; les pages les attrapent et les affichent.
// ===========================================================================
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { adminAuth, auth, db } from '../firebase/config'

// Longueur autorisée pour les mots de passe (règle métier de l'application).
export const LONGUEUR_MIN_MOT_DE_PASSE = 6
export const LONGUEUR_MAX_MOT_DE_PASSE = 10

// Vérifie la longueur d'un mot de passe avant tout appel Firebase.
function verifierLongueurMotDePasse(motDePasse) {
  if (!motDePasse || motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    const error = new Error(
      `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`,
    )
    error.code = 'auth/weak-password'
    throw error
  }
  if (motDePasse.length > LONGUEUR_MAX_MOT_DE_PASSE) {
    const error = new Error(
      `Le mot de passe ne doit pas dépasser ${LONGUEUR_MAX_MOT_DE_PASSE} caractères.`,
    )
    error.code = 'auth/password-too-long'
    throw error
  }
}

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
    case 'auth/missing-password':
      return 'Le mot de passe actuel est obligatoire.'
    case 'auth/requires-recent-login':
      return 'Veuillez vous reconnecter avant de modifier votre mot de passe.'
    case 'auth/email-already-in-use':
      return 'Un compte existe déjà avec cet email.'
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir entre 6 et 10 caractères.'
    case 'auth/password-too-long':
      return 'Le mot de passe ne doit pas dépasser 10 caractères.'
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

  verifierLongueurMotDePasse(password)

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

// ---------------------------------------------------------------------------
// Changement du mot de passe de l'utilisateur connecté.
// ---------------------------------------------------------------------------
// updatePassword est une opération sensible : Firebase exige une session
// récente. On réauthentifie donc avec le mot de passe actuel avant de le
// remplacer, ce qui évite l'erreur "auth/requires-recent-login".
// ---------------------------------------------------------------------------
export async function changerMotDePasse({ motDePasseActuel, nouveauMotDePasse }) {
  const currentUser = auth.currentUser
  if (!currentUser?.email) {
    throw new Error('Aucun utilisateur connecté.')
  }
  if (!motDePasseActuel) {
    const error = new Error('Le mot de passe actuel est obligatoire.')
    error.code = 'auth/missing-password'
    throw error
  }

  verifierLongueurMotDePasse(nouveauMotDePasse)

  const credential = EmailAuthProvider.credential(currentUser.email, motDePasseActuel)

  try {
    await reauthenticateWithCredential(currentUser, credential)
    await updatePassword(currentUser, nouveauMotDePasse)
  } catch (err) {
    // Messages dédiés au changement de mot de passe : on ne parle jamais
    // d'email ici, l'échec vient du mot de passe actuel ou de la session.
    const messages = {
      'auth/invalid-credential': 'Le mot de passe actuel est incorrect.',
      'auth/wrong-password': 'Le mot de passe actuel est incorrect.',
      'auth/missing-password': 'Le mot de passe actuel est obligatoire.',
      'auth/weak-password': 'Le nouveau mot de passe doit contenir entre 6 et 10 caractères.',
      'auth/password-too-long': 'Le nouveau mot de passe ne doit pas dépasser 10 caractères.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
      'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
      'auth/requires-recent-login': 'Veuillez vous reconnecter avant de modifier votre mot de passe.',
      'auth/user-token-expired': 'Votre session a expiré. Reconnectez-vous puis réessayez.',
      'auth/user-disabled': 'Ce compte a été désactivé.',
    }
    const error = new Error(
      messages[err.code] || "Impossible de changer le mot de passe. Vérifiez vos informations et réessayez.",
    )
    error.code = err.code
    throw error
  }
}