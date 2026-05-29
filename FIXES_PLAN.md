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

- [x] **Mutations artistes transactionnelles (le point le plus important)** 🔴
  - Fichiers : `server/api/artists/index.post.ts`, `server/api/artists/[id]/index.patch.ts`, `supabase/migrations/20260529000001_artist_transactional_mutations.sql`
  - Problème : artiste créé/màj même si les liens (sociaux/plateformes/relations/companies) échouent → données partielles, réponse `200` trompeuse.
  - ✅ Fait — 2 RPC Postgres atomiques `create_artist_with_relations` / `update_artist_with_relations` (insert/update artiste + toutes relations en une transaction ; rollback complet si une étape échoue ; EXECUTE restreint à `service_role`). Endpoints refactorés pour les appeler (erreurs propagées, plus de swallow ; 404 si introuvable à l'update). Migration **appliquée en prod via MCP**, types TS régénérés, **testée en live (transaction rollback)** contre le vrai schéma, advisors sécurité OK (aucune nouvelle alerte). Tests ajoutés (create/update).
  - ⏭️ Reste à faire si souhaité : appliquer la même logique transactionnelle aux mutations `releases` / `musics` / `news` (les endpoints releases ont déjà un rollback applicatif partiel).

- [x] **Polling bloquant du middleware admin** 🟡
  - Fichier : `app/middleware/admin.ts`
  - Action : remplacer le busy-wait `setTimeout` 100 ms × 30 (jusqu'à 3 s d'écran blanc) par l'attente de la Promise `ensureAuthInitialized()` déjà existante.
  - ✅ Fait (commit `5cb0e16`) — `watch` réactif sur `userData` (résout dès l'arrivée de la donnée), plafonné à `AUTH_MAX_WAIT_TIME_MS`. Sémantique préservée (test admin 3/3).

- [x] **Créer `server/api/artists/paginated`** 🟡
  - Fichiers : `server/api/artists/paginated.get.ts` (nouveau) + `app/composables/Supabase/useSupabaseArtist.ts`
  - ✅ Fait — endpoint serveur répliquant fidèlement `fetchArtistsByPage` (tous les filtres + filtrage relation côté page), service-role (cohérent avec les autres endpoints paginés). Lister les artistes **non vérifiés** requiert `requireContributor` (durcissement). `getArtistsByPage` consomme l'endpoint ; les 3 pages (`artist/index`, `dashboard/artist`, `dashboard/validation`) restent inchangées.

---

## 🔴 Niveau 4 — Chantiers lourds (plusieurs jours)

- [~] **Unifier l'état d'authentification (source de vérité unique)** 🟠 — *en cours, plan en 10 étapes*
  - Problème : vérité d'auth éclatée sur 5 sources (`useSupabaseUser()`, 4 slots du store Pinia, localStorage, cookie brut lu par `useApiAuthHeaders`, serveur). La plupart des lecteurs combinent 2-4 sources avec un OU logique → aucun invariant de cohérence.
  - **Cible** : la session Supabase est la source de vérité ; le store devient un **cache dérivé** (`profile` + `status`) ; lecture unique via `useAuth(){ isLoggedIn, isAdmin }` ; un seul abonné réactif (`onAuthStateChange`) ; upsert profil unique partagé.
  - Plan d'implémentation incrémental (issu d'une cartographie + design multi-agents) :
    - [x] **Étape 3 — `isAdmin` devient un getter dérivé** ✅ Fait. `isAdminStore = computed(() => userDataStore.role === 'ADMIN')` dans le store ; suppression de `setIsAdmin` + des écritures redondantes (store, `afterHydrate`, `preserveAuthenticatedState`, `runInitializeAuth`). Plus aucune désync possible. Tous les lecteurs (via `storeToRefs`) inchangés. Vérifié par tests middleware + typecheck.
    - [ ] Étape 1 — exposer `isLoggedIn` (computed unique) dans `useAuth` (low). *Sûr.*
    - [ ] Étape 2 — migrer les composants/pages d'affichage vers `useAuth().isLoggedIn/isAdmin` (medium). ⚠️ attention au garde `isHydrated` (flash SSR) dans `navigation`/`MobileNavigation` — à préserver.
    - [ ] Étape 4 — extraire l'upsert profil dans un helper unique, l'utiliser dans `callback.vue` (supprime la 3ᵉ implémentation dupliquée) (medium).
    - [ ] Étape 5 — aligner la stratégie d'attente des middlewares (un seul timeout). ⚠️ dépend de l'étape 7 pour être sûr (sinon réintroduit une race) ; le `watch` réactif ajouté au Niveau 3 est un bon intermédiaire.
    - [ ] Étape 6 — `useApiAuthHeaders` : lire le token via `getSession()` au lieu de parser le cookie (medium). ⚠️ `getSession()` est async → ripple sur les appelants synchrones.
    - [ ] **Étapes 7-10 — HAUT RISQUE, test manuel OAuth requis** (je ne les fais pas à l'aveugle) :
      - 7 : unifier les 2 abonnés réactifs (`watch(user)` + `onAuthStateChange`) en un seul.
      - 8 : réduire le store à `profile + status`, fusionner `preserve`/`sync` en une mutation atomique, remplacer `isHydrated` par `status`.
      - 9 : durcir `logout` (pas d'état zombie), supprimer `sharedIsLoggingOutFlag`.
      - 10 : simplifier le callback popup + supprimer les délais fixes empilés.
  - Bonus fait : suppression du code mort `useLastRoomYouTryToJoined` (`useState.ts`).

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
