# Plan de correction — Comeback

> Liste des points faibles identifiés (sécurité, architecture, code, flow), ordonnés **du plus simple au plus difficile** à mettre en place.
> Coche chaque case au fur et à mesure. Sévérité : 🔴 critique · 🟠 élevé · 🟡 moyen · 🔵 faible.

---

## 🟢 Niveau 1 — Quick wins (< 15 min chacun)

- [x] **Supprimer le code mort `/newdashboard`** 🔵
  - Fichier : `nuxt.config.ts:94`
  - Action : retirer la ligne `'/newdashboard/**': { ssr: false }` (aucun dossier `app/pages/newdashboard` n'existe).
  - ✅ Fait — règle supprimée + table de rendu de `CLAUDE.md` mise à jour.

- [x] **Sortir `YOUTUBE_API_KEY` du runtime public** 🟠
  - Fichier : `nuxt.config.ts:49`
  - Action : déplacer `YOUTUBE_API_KEY` de `runtimeConfig.public` vers `runtimeConfig` (serveur uniquement). Mettre à jour les endpoints admin YouTube pour lire `config.YOUTUBE_API_KEY` au lieu de `config.public.YOUTUBE_API_KEY`.
  - ✅ Fait — clé en runtime serveur ; `mv-candidates.get.ts`, `link-mv.post.ts` et le test associé mis à jour. Aucun usage client.

- [x] **Renommer le secret Supabase (retirer le préfixe `NUXT_PUBLIC_`)** 🟠
  - Fichiers : `.env`, `nuxt.config.ts:5-6`
  - Action : renommer `NUXT_PUBLIC_SUPABASE_SECRET_KEY` → `SUPABASE_SECRET_KEY` dans `.env`. Adapter le fallback en haut de `nuxt.config.ts`.
  - ✅ Fait — `.env` renommé (cohérent avec `.env.example`), fallback simplifié, doc (`CLAUDE.md` + `README.md`) mise à jour.
  - ⚠️ **À faire manuellement** : renommer aussi la variable sur l'hébergeur (Netlify).

- [x] **Comparaison constante du `CRON_SECRET`** 🔵
  - Fichier : `server/utils/auth.ts:162`
  - Action : remplacer `auth !== \`Bearer ${config.CRON_SECRET}\`` par une comparaison via `crypto.timingSafeEqual` (avec garde sur la longueur des buffers).
  - ✅ Fait — `timingSafeEqual` + comparaison de longueur.

---

## 🟡 Niveau 2 — Petites corrections ciblées (< 1 h chacune)

- [x] **Masquer les détails d'erreur Supabase en production** 🟡
  - Fichier : `server/utils/errorHandler.ts`
  - Action : ne renvoyer `error.hint` / `error.details` / `error.code` que si `import.meta.dev`. En prod : message générique + log serveur complet.
  - ✅ Fait — en prod, `statusMessage`/`message` génériques, plus de `data`. Le log serveur complet (code/hint/details) reste inchangé.
  - 🔧 Tooling associé : `tsconfig.test.json` utilise `types: ["vitest/importMeta", "nuxt/app"]` (au lieu d'inclure l'artefact généré `.nuxt/nuxt.d.ts`) pour typer `import.meta.dev` ; `vitest.config.ts` ajoute `define: { 'import.meta.dev': 'true' }` (contexte de dev) pour que les tests couvrent la branche détaillée.

- [x] **Valider le token OAuth avant `setSession`** 🟡
  - Fichier : `app/composables/auth/supabase-auth.composable.ts`
  - Action : dans `storageHandler`, valider le token (`supabase.auth.getUser(token)`) avant `setSession`. Ne plus avaler silencieusement les erreurs de `setSession` (logguer + rejeter).
  - ✅ Fait — helper `hydrateSession()` partagé par les handlers `message` ET `storage` : vérifie le token côté serveur (`getUser(access_token)`) avant `setSession`.
  - 🔁 **Corrigé après revue adversariale** : la 1re version *bloquait* `handleAuthSuccess` si la validation échouait + faisait `cleanupListeners()` → un utilisateur **légitime** était éjecté sur un simple échec réseau transitoire de `getUser` (régression HIGH). `hydrateSession` est désormais **best-effort** : il valide avant `setSession` (un token forgé n'est jamais injecté) mais ne *gate* plus le flux ; `handleAuthSuccess()` est toujours appelé et récupère via la session déjà persistée (cookies/localStorage). Résilience d'origine restaurée + bénéfice sécurité conservé.

- [x] **Whitelist du paramètre `mode` (suppression d'artiste)** 🟡
  - Fichier : `server/api/artists/[id]/index.delete.ts`
  - Action : restreindre `mode` à une liste blanche (`['safe', 'simple']`), défaut `safe`.
  - ✅ Fait — `query.mode === 'simple' ? 'simple' : 'safe'`.

- [x] **Caching cohérent sur les endpoints `complete`** 🟡
  - Fichiers : `server/api/releases/[id]/complete.get.ts`
  - ✅ Fait (partiel) — cache explicite long (`max-age=3600`) sur `releases/complete` (contenu statique).
  - ℹ️ Constat : le route rule global `/api/**` applique déjà `s-maxage=300` à TOUS les endpoints → « aucun cache » était inexact.
  - ⏭️ `artists/complete` laissé sur le défaut court : il renvoie des musiques **aléatoires**, un cache long figerait l'aléatoire.
  - ⏭️ **Projections (`select('*')`)** : reporté volontairement — remplacer par des colonnes explicites risque de casser des conscommateurs client ; à faire après audit des champs réellement utilisés.

- [x] **Robustesse de `transformJunction` sur null** 🔵
  - Fichier : `server/utils/transformers.ts`
  - ✅ Vérifié — le code filtre déjà null ET undefined (`item != null`). Aucun changement nécessaire (le risque signalé par l'agent n'existe pas).

---

## 🟠 Niveau 3 — Refactors structurés (quelques heures à 1 j)

- [ ] **Mutations artistes transactionnelles (le point le plus important)** 🔴
  - Fichiers : `server/api/artists/index.post.ts:57-101`, `server/api/artists/[id]/index.patch.ts`
  - Problème : artiste créé/màj même si les liens (sociaux/plateformes/relations/companies) échouent → données partielles, réponse `200` trompeuse.
  - Action : envelopper création + relations dans une fonction RPC Postgres transactionnelle (sur le modèle de `delete_artist_safely`), OU rollback applicatif si une relation échoue. Remonter une vraie erreur au client.
  - Étendre la même logique aux mutations `releases` / `musics` / `news` si concernées.

- [ ] **Polling bloquant du middleware admin** 🟡
  - Fichier : `app/middleware/admin.ts`
  - Action : remplacer le busy-wait `setTimeout` 100 ms × 30 (jusqu'à 3 s d'écran blanc) par l'attente de la Promise `ensureAuthInitialized()` déjà existante. Aligner `auth.ts` et `admin.ts` sur le même mécanisme.

- [ ] **Créer `server/api/artists/paginated`** 🟡
  - Fichiers : nouvel endpoint serveur + `app/composables/Supabase/helpers/artist/artistQueries.ts`
  - Action : déplacer la logique de pagination/filtrage des artistes (actuellement côté client, accès Supabase direct) vers un endpoint serveur, par symétrie avec `musics/paginated` et `releases/paginated`. Le composable client consomme l'endpoint.

---

## 🔴 Niveau 4 — Chantiers lourds (plusieurs jours)

- [ ] **Unifier l'état d'authentification (source de vérité unique)** 🟠
  - Fichiers : `app/composables/useAuth.ts`, `app/stores/user.ts`, `app/middleware/*`, `app/composables/useState.ts`
  - Problème : vérité d'auth éclatée entre `useSupabaseUser()`, `userStore.userDataStore`, `userStore.isLoginStore`, singletons globaux et `useState`. Source de désync et de bugs.
  - Action : centraliser dans le store Pinia, supprimer les états redondants, exposer une API claire (`isAuthenticated`, `isAdmin`, `ready`). Ajouter des tests.

- [ ] **Simplifier `musics/paginated.get.ts`** 🟡
  - Fichier : `server/api/musics/paginated.get.ts` (~450 lignes)
  - Action : réduire le chemin RPC → re-fetch → tri client → requêtes « boundary ». Viser 1–2 requêtes par page, tri côté BDD. Couvrir par des tests avant refactor.

- [ ] **Découper les pages dashboard monolithiques** 🟡
  - Fichiers : `app/pages/dashboard/artist.vue`, `music.vue`, `release.vue` (600–850 lignes chacune)
  - Action : extraire les sous-composants réutilisables `Table` / `Filters` / `Modal` ; factoriser la logique filtres+pagination dupliquée (composable partagé). Réduit la surface de régression.

---

## Notes

- Points **surévalués** lors de l'analyse (à NE PAS traiter comme critiques) :
  - Fuite supposée du secret Supabase côté client → en réalité non exposé (config serveur). Voir Niveau 1 (renommage par hygiène uniquement).
  - « Bypass » du middleware admin via localStorage → cosmétique seulement ; les données restent protégées par `requireAdmin` côté serveur.
- Avant chaque refactor lourd (Niveau 3-4), ajouter/vérifier la couverture de tests (`npm run test:run`).
- Lancer `npm run check` après chaque lot de corrections.
