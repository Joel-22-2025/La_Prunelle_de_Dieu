// ===========================================================================
// Configuration Firebase
// ---------------------------------------------------------------------------
// Les valeurs sont chargées depuis le fichier ".env" à la racine du projet.
// Copiez ".env.example" en ".env" et renseignez vos propres identifiants
// (console Firebase > Paramètres du projet > Général > Vos applications).
// ===========================================================================
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// ---------------------------------------------------------------------------
// Instance principale : utilisée par l'utilisateur (admin ou pharmacien)
// qui se connecte normalement à l'application.
// ---------------------------------------------------------------------------
export const app = initializeApp(firebaseConfig)

// ---------------------------------------------------------------------------
// Instance secondaire "admin-creation-app" : réservée à la création des
// comptes pharmaciens par l'admin.
//
// Pourquoi ? createUserWithEmailAndPassword sur l'instance principale
// remplacerait la session du dernier utilisateur connecté. Avec une instance
// dédiée, l'admin reste connecté tout en créant de nouveaux comptes.
// ---------------------------------------------------------------------------
export const adminApp = initializeApp(firebaseConfig, 'admin-creation-app')

export const auth = getAuth(app)
export const adminAuth = getAuth(adminApp)
export const db = getFirestore(app)