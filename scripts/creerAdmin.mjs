// ===========================================================================
// Création du premier compte ADMINISTRATEUR "La Prunelle de Dieu"
// ---------------------------------------------------------------------------
// Comme les pharmaciens ne peuvent pas s'inscrire eux-mêmes, il faut créer
// le tout premier admin manuellement, via un script côté serveur avec le
// SDK Admin Firebase.
//
// Prérequis :
//   1. Activez "Authentication > Sign-in method > E-mail/Mot de passe"
//      dans la console Firebase.
//   2. Téléchargez la clé privée du compte de service :
//      Console Firebase > Paramètres du projet > Comptes de service
//      > "Générer une nouvelle clé privée", puis placez le fichier à la
//      racine sous le nom "serviceAccountKey.json".
//
// Utilisation (depuis la racine du projet) :
//   node scripts/creerAdmin.mjs <email> <motDePasse> <nom> <prenom>
//
// Exemple :
//   node scripts/creerAdmin.mjs admin@prunelle.fr "MotDePasse" "Durand" "Jeanne"
// ===========================================================================
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Chargement de la clé de service.
// ---------------------------------------------------------------------------
let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(new URL('../serviceAccountKey.json', import.meta.url), 'utf8'))
} catch {
  console.error(
    'Fichier "serviceAccountKey.json" introuvable à la racine du projet.\n' +
      'Téléchargez-le depuis : Console Firebase > Paramètres du projet > Comptes de service.',
  )
  process.exit(1)
}

const adminApp = initializeApp({ credential: cert(serviceAccount) })
const auth = getAuth(adminApp)
const db = getFirestore(adminApp)

// ---------------------------------------------------------------------------
// Arguments : email, mot de passe, nom, prénom.
// ---------------------------------------------------------------------------
const [, , email, password, nom, prenom] = process.argv

if (!email || !password || !nom || !prenom) {
  console.error(
    'Usage : node scripts/creerAdmin.mjs <email> <motDePasse> <nom> <prenom>\n' +
      'Exemple : node scripts/creerAdmin.mjs admin@prunelle.fr "MotDePasse" Durand Jeanne',
  )
  process.exit(1)
}

// Règle métier : le mot de passe doit contenir entre 6 et 10 caractères.
if (password.length < 6 || password.length > 10) {
  console.error('Le mot de passe doit contenir entre 6 et 10 caractères.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 1. Création (ou récupération) de l'utilisateur Firebase Auth.
// ---------------------------------------------------------------------------
let uid
try {
  const existing = await auth.getUserByEmail(email)
  uid = existing.uid
  console.log(`Utilisateur Auth existant (uid : ${uid}).`)
} catch {
  const created = await auth.createUser({
    email,
    password,
    displayName: `${prenom} ${nom}`,
  })
  uid = created.uid
  console.log(`Utilisateur Auth créé (uid : ${uid}).`)
}

// ---------------------------------------------------------------------------
// 2. Création du profil Firestore avec le rôle "admin".
// Le document porte l'id = uid Firebase Auth.
// ---------------------------------------------------------------------------
await db
  .collection('users')
  .doc(uid)
  .set({
    uid,
    email: email.toLowerCase(),
    nom,
    prenom,
    role: 'admin',
    actif: true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'manuel',
  })

console.log('Profil administrateur écrit dans Firestore (collection "users").')
console.log('Vous pouvez maintenant vous connecter sur /login avec cet email.')
process.exit(0)