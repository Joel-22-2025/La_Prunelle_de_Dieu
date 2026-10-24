# AGENTS.md

SPA de gestion de pharmacie/clinique « La Prunelle de Dieu » : React 19 + Vite 8 + Tailwind v4, données Firebase (Auth + Firestore), UI et commentaires en français.

## Commandes

- `npm run dev` — serveur Vite.
- `npm run build` — `tsc -b && vite build` (seule vérification complète ; ~1 min).
- `npm run lint` — oxlint. Beaucoup de warnings `react(set-state-in-effect)` / `only-export-components` sont préexistants ; ne pas les corriger en masse.
- `npm run preview` — sert `dist/`.
- Aucun runner de test (pas de Vitest/Jest/Playwright, pas de script `test`). Ne pas en inventer : vérifier avec build + lint + test manuel sur Firebase réel.
- Scripts à lancer directement avec `node` (pas d'alias npm), tous exigent `serviceAccountKey.json` à la racine (gitignoré) :
  - `node scripts/creerAdmin.mjs <email> <motDePasse> <nom> <prenom>` — premier admin.
  - `node scripts/creerDonneesTest.mjs [--force]` — médicaments + stock de test.
  - `node scripts/deployerRegles.mjs` — publie `firestore.rules` via l'API REST (pas de Firebase CLI).

## Setup Firebase

- Copier `.env.example` vers `.env` et renseigner les `VITE_FIREBASE_*`. Pas d'émulateur : l'app parle à un vrai projet Firebase.
- Les règles `firestore.rules` sont la vraie autorisation. Après modification, redéployer avec `scripts/deployerRegles.mjs`.
- `src/firebase/config.js` initialise deux apps : `auth` (session courante) et `adminAuth` (instance secondaire pour créer un pharmacien sans déconnecter l'admin). Ne pas fusionner les deux.
- Changement de mot de passe : `changerMotDePasse` réauthentifie avec le mot de passe actuel avant `updatePassword` (Firebase l'exige pour une session ancienne) et renvoie des messages dédiés, sans jamais parler d'email.
- Longueur des mots de passe : 6 à 10 caractères, via `LONGUEUR_MIN_MOT_DE_PASSE` / `LONGUEUR_MAX_MOT_DE_PASSE` dans `authService` (création pharmacien, changement de mot de passe, script admin).

## Architecture

- Entrée : `src/main.jsx` → `AuthProvider` → `src/App.jsx` (table de routes). Toutes les pages connectées sont sous `Layout`; `/admin/*` est en plus protégé par `RoleRoute role="admin"`. Ces guards sont de l'UX ; la sécurité est dans les règles Firestore.
- Le code applicatif est en **`.jsx`, pas `.tsx`** (seul `src/lib/utils.ts` est en TS). `tsconfig.app.json` n'active pas `allowJs` : `tsc -b` ne typecheck pas les `.jsx`. Un build vert ne prouve donc pas l'absence d'erreurs de types ; ne pas convertir massivement en TS.
- Accès aux données via `src/services/*.js` uniquement. Les pages/composants ne construisent pas de requêtes Firestore pour les flux métier.
- Collections : `users` (doc id = uid, champ `role`/`actif`), `medicaments`, `stock` (doc id = `medicamentId`), `mouvementsStock` (immuables), `ventes`, `factures`, `clients`, `compteurs`.
- Numérotation : ventes `V-YYYY-NNNN` (compteur annuel), factures sur 7 chiffres via `compteurs/global` (jamais réinitialisé). Les deux numéros sont attribués **dans la même transaction** que la vente (`creerVente`), avec stock + facture. Ne jamais générer un numéro côté UI ni en écritures séparées.
- Transactions Firestore : toutes les lectures avant toutes les écritures (contrainte dure respectée dans `venteService`/`stockService`). Toute vente doit rester atomique (stock insuffisant ⇒ rollback total).
- Les listes sont volontairement bornées (`limit`) puis filtrées côté client pour éviter les index composites (ex. `getMouvementsStock`, `rechercherClients`, `getFactureByVenteId`). Conserver ce pattern ou créer l'index explicitement.
- Facturation : `src/config/pharmacieConfig.js` est l'unique source des coordonnées/logo officiels ; ne pas les dupliquer. Le PDF jsPDF (`formatPDF: 'ticket'` 80 mm par défaut, `'a4'` en option) doit rester identique à `FacturePreview`. Impression thermique ESC/POS via WebUSB/WebSerial, avec normalisation ASCII des accents.
- Formatage : `@/lib/format` pour pages/composants, `@/utils/formatage` pour factures/PDF/rapports. Les signatures diffèrent (`formatMontant`) ; importer du module correspondant au domaine, ne pas fusionner à l'aveugle.
- UI : composants shadcn (`base-nova`) dans `src/components/ui`, thème Tailwind v4 uniquement en CSS dans `src/index.css` (pas de `tailwind.config`), dark mode par classe `.dark`, alias `@/`, helper `cn` dans `@/lib/utils`. Montants en FCFA, formats `fr-FR`.
- Splash de démarrage : `src/components/SplashScreen.jsx`, affiché par `App.jsx` (constantes `DUREE_SPLASH` / `DUREE_FONDU`) et animé par les classes `splash-*` de `src/index.css`.
- Déploiement Vercel statique (`vercel.json`, sortie `dist`) ; aucun serveur/API, tout le backend est Firebase. La règle `rewrites` vers `/index.html` est indispensable au routing SPA (sinon un refresh sur `/dashboard` renvoie 404) ; ne pas la supprimer.
- Style : pas de Prettier/ESLint de formatage ; suivre l'existant (pas de `;`, quotes simples, 2 espaces, commentaires en français).

## Pièges métier

- Une vente/facture ne se supprime jamais (règles Firestore) ; l'annulation est admin uniquement et conserve l'historique.
- Un pharmacien ne peut lire que ses propres ventes ; l'admin voit tout. Toute nouvelle requête doit respecter ce filtre, sinon elle échoue en production.
- Le stock d'un pharmacien ne peut être décrémenté que pendant une vente (champs `quantiteDisponible`/`updatedAt` autorisés par les règles). Les entrées/sorties/inventaires sont admin.
