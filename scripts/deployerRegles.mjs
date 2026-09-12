// ===========================================================================
// Déploiement des règles Firestore depuis le terminal (sans CLI Firebase)
// ---------------------------------------------------------------------------
// Uploade le fichier "firestore.rules" vers le projet via l'API REST
// Firebase Rules, en utilisant la clé privée "serviceAccountKey.json"
// (OAuth2 JWT). Aucune connexion navigateur nécessaire.
//
// Utilisation (depuis la racine du projet) :
//   node scripts/deployerRegles.mjs
// ===========================================================================
import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

// ---------------------------------------------------------------------------
// 1. Chargement de la clé de service.
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

// ---------------------------------------------------------------------------
// 2. Lecture des règles à déployer.
// ---------------------------------------------------------------------------
const rulesContent = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')

// ---------------------------------------------------------------------------
// 3. Obtention d'un token OAuth2 via la signature JWT (RS256).
// ---------------------------------------------------------------------------
const base64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replaceAll('+', '-').replaceAll('/', '_')

const now = Math.floor(Date.now() / 1000)
const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
const claims = base64url(
  JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }),
)
const unsigned = `${header}.${claims}`
const signature = base64url(
  createSign('RSA-SHA256')
    .update(unsigned)
    .sign(serviceAccount.private_key.replaceAll('\\n', '\n')),
)
const assertion = `${unsigned}.${signature}`

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }),
})

const tokenData = await tokenRes.json()
if (!tokenRes.ok || !tokenData.access_token) {
  console.error('Échec de l\'obtention du token OAuth2 :', tokenData.error_description || tokenData.error || tokenData)
  process.exit(1)
}
const accessToken = tokenData.access_token
console.log('Token OAuth2 obtenu.')

// ---------------------------------------------------------------------------
// 4. Création d'un nouveau "ruleset" à partir du contenu de firestore.rules.
// ---------------------------------------------------------------------------
const projectId = serviceAccount.project_id
const headers = {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
}

const rulesetRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    source: {
      files: [{ name: 'firestore.rules', content: rulesContent }],
    },
  }),
})

const rulesetData = await rulesetRes.json()
if (!rulesetRes.ok || !rulesetData.name) {
  console.error('Échec de la création du ruleset :', JSON.stringify(rulesetData))
  process.exit(1)
}
// règles asynchrones : attendre la propagation du ruleset.
await sleep(1000)
console.log(`Ruleset créé : ${rulesetData.name}`)

// ---------------------------------------------------------------------------
// 5. Publication du ruleset sur la release "cloud.firestore".
// ---------------------------------------------------------------------------
const releaseName = `projects/${projectId}/releases/cloud.firestore`
const releaseRes = await fetch(
  `https://firebaserules.googleapis.com/v1/${releaseName}`,
  {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      release: {
        name: releaseName,
        rulesetName: rulesetData.name,
      },
      updateMask: 'rulesetName',
    }),
  },
)

const releaseData = await releaseRes.json()
if (!releaseRes.ok || !releaseData.name) {
  console.error('Échec de la publication des règles :', JSON.stringify(releaseData))
  process.exit(1)
}

console.log(`Règles Firestore publiées : ${releaseData.rulesetName}`)
console.log('Les accès admin sur medicaments / stock / mouvementsStock sont maintenant autorisés.')
process.exit(0)