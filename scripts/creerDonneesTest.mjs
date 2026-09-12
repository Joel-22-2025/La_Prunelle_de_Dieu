// ===========================================================================
// Création de données de test : médicaments + stock "La Prunelle de Dieu"
// ---------------------------------------------------------------------------
// Remplit la collection "medicaments" (3 références) et la collection
// "stock" (1 doc par médicament) directement via le SDK Admin Firebase,
// sans passer par la console.
//
// Prérequis :
//   - "serviceAccountKey.json" à la racine (même fichier que creerAdmin.mjs).
//
// Utilisation (depuis la racine du projet) :
//   node scripts/creerDonneesTest.mjs
//   node scripts/creerDonneesTest.mjs --force   (réécrit les docs existants)
// ===========================================================================
import { cert, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

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
const db = getFirestore(adminApp)

const force = process.argv.includes('--force')

// ---------------------------------------------------------------------------
// Les 3 médicaments de test. Les IDs sont FIXES pour pouvoir référencer les docs "stock".
// ---------------------------------------------------------------------------
const medicaments = [
  {
    id: 'med_test_doliprane',
    nom: 'Doliprane 1000mg',
    formePharmaceutique: 'comprimé',
    dosage: '1000 mg',
    principeActif: 'Paracétamol',
    categorie: 'analgésique',
    codeBarre: '3400930000001',
    prixAchat: 1.5,
    prixVente: 2.5,
    seuilMinimal: 10,
    statut: 'actif',
  },
  {
    id: 'med_test_amoxicilline',
    nom: 'Amoxicilline 1g',
    formePharmaceutique: 'gélule',
    dosage: '1000 mg',
    principeActif: 'Amoxicilline',
    categorie: 'antibiotique',
    codeBarre: '3400930000002',
    prixAchat: 2.8,
    prixVente: 4.2,
    seuilMinimal: 15,
    statut: 'actif',
  },
  {
    id: 'med_test_smecta',
    nom: 'Smecta adult',
    formePharmaceutique: 'suspension buvable',
    dosage: '3 g',
    principeActif: 'Diosmectite',
    categorie: 'digestif',
    codeBarre: '3400930000003',
    prixAchat: 3.9,
    prixVente: 5.8,
    seuilMinimal: 5,
    statut: 'actif',
  },
]

// Quantité de départ par médicament.
const stockInitial = {
  med_test_doliprane: { quantite: 50 },
  med_test_amoxicilline: { quantite: 40 },
  med_test_smecta: { quantite: 4 }, // volontairement sous le seuil (5) pour tester les alertes
}

console.log(`Ajout des données de test (force=${force})...\n`)

for (const med of medicaments) {
  const medRef = db.collection('medicaments').doc(med.id)
  const stockRef = db.collection('stock').doc(med.id)

  const medDoc = await medRef.get()
  const stockDoc = await stockRef.get()

  if (medDoc.exists || stockDoc.exists) {
    if (!force) {
      console.warn(`⏭  "${med.nom}" existe déjà (id: ${med.id}). Relancez avec --force pour réécrire.`)
      continue
    }
    // On conserve createdAt d'origine si le doc existe déjà.
    const createdAt =
      medDoc.exists && medDoc.data()?.createdAt ? medDoc.data().createdAt : FieldValue.serverTimestamp()
    await medRef.set({
      ...med,
      createdAt,
      updatedAt: FieldValue.serverTimestamp(),
    })
  } else {
    await medRef.set({
      ...med,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  const seuil = stockInitial[med.id]
  await stockRef.set({
    medicamentId: med.id,
    quantiteDisponible: seuil.quantite,
    seuilMinimal: med.seuilMinimal,
    derniereModification: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  })

  console.log(`✔ "${med.nom}" — médicament + stock (${seuil.quantite} unités).`)
}

console.log('\nDonnées de test créées dans Firestore :')
console.log('  - Collection "medicaments" : 3 références.')
console.log('  - Collection "stock" : 3 documents (référencés par medicamentId).')
console.log('Connectez-vous sur /login puis allez dans Médicaments et Stock.')
process.exit(0)