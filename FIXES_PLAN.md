# Plan de correction — Comeback

> Liste des points faibles identifiés (sécurité, architecture, code, flow), ordonnés **du plus simple au plus difficile** à mettre en place.
> Coche chaque case au fur et à mesure. Sévérité : 🔴 critique · 🟠 élevé · 🟡 moyen · 🔵 faible.

---

## 🔴 Hors-niveaux — Faille RPC `SECURITY DEFINER` (découverte + corrigée après l'audit)

- [x] **RPC `SECURITY DEFINER` exécutables par `anon`/`authenticated` sans garde** 🔴
  - Constat (vérifié via `pg_proc` + appel anon réel en lecture) : `delete_artist_safely`, `delete_artist_simple`, `analyze_artist_deletion_impact`, `get_top_contributors` (fuite **emails**), `get_contributions_stats` étaient appelables directement via `/rest/v1/rpc/...` avec la clé anon publique → contournement total de `requireAdmin`. `reorder_ranking_items_atomic` : appelable par tout `authenticated` **sans garde d'appartenance** → réordonnancement du ranking d'autrui.
  - ✅ Fait — migration `20260530000001_secure_exposed_rpcs.sql` **appliquée en prod** : `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` (garder `service_role`) sur les 5 fonctions server-only/inutilisées ; **garde d'appartenance** (`auth.uid()` propriétaire) ajoutée à `reorder_ranking_items_atomic` (gardée `authenticated`).
  - ✅ Vérifié : ACLs `pg_proc` post-fix corrects ; garde reorder testée en live (`42501 Not authorized`) ; advisors → les 5 fonctions ont disparu des alertes anon/authenticated. Code mort client supprimé (`artistCrud.ts` helpers RPC).
  - ℹ️ Laissés volontairement : `is_admin`/`is_contributor_or_admin`/`get_user_role` (helpers utilisés par les policies RLS — ne PAS révoquer) ; `get_top_contributors` côté client (`getTopContributors`, mort, fallback gracieux).

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

- [x] **Unifier l'état d'authentification (source de vérité unique)** 🟠 — *fait (cœur), 2 sous-points écartés avec justification*
  - Problème : vérité d'auth éclatée sur 5 sources (`useSupabaseUser()`, 4 slots du store Pinia, localStorage, cookie brut lu par `useApiAuthHeaders`, serveur). La plupart des lecteurs combinaient 2-4 sources avec un OU logique → aucun invariant de cohérence.
  - **Cible** : session Supabase = source de vérité ; store = cache dérivé ; lecture unique via `useAuth(){ isLoggedIn, isAdmin, isReady }` ; un seul abonné réactif ; upsert profil unique partagé.
  - État des 10 étapes (cartographie + design multi-agents) :
    - [x] **Étape 3** — `isAdmin` = getter dérivé (`computed(() => userDataStore.role === 'ADMIN')`) ; suppression de `setIsAdmin` + écritures redondantes. Désync impossible. *(commit `344f82d`)*
    - [x] **Étape 1** — `isLoggedIn` + `isReady` exposés par `useAuth` (définition unique de l'union). *(commit `2684d1e`)*
    - [x] **Étape 2** — `navigation.vue` + `MobileNavigation.vue` migrés vers `useAuth` (garde `isHydrated`/`isReady` préservée). Les lectures page-level de `isAdminStore` pointent déjà sur le getter unique → laissées (churn cosmétique évité). *(commit `2684d1e`)*
    - [x] **Étape 7** — suppression du `watch(user)` de `useAuth` ; `onAuthStateChange` (plugin) devient l'unique abonné réactif (fin du double-cascade). *(commit `5e19226`)*
    - [x] **Étape 9** — `logout` durci (clear + navigate en `finally`, plus d'état zombie) ; `sharedIsLoggingOutFlag` supprimé. *(commit `5e19226`)*
    - [x] **Étape 8 (slice)** — suppression de `supabaseUserStore`/`setSupabaseUser` (source session-user dupliquée, write-only). *(commit `27ed0de`)*
    - [x] **Étape 4** — upsert profil extrait en helper unique `helpers/user/upsertUserProfile.ts`, utilisé par `useAuth` ET `callback.vue` (fin de la triplication ; comportement unifié : backfill des champs vides + rôle préservé). *(commit `27ed0de`)*
    - [⊘] **Étape 5 — écartée** : mon `watch` réactif du Niveau 3 dans `admin.ts` est déjà un bon mécanisme ; `auth.ts` (auth seule) et `admin.ts` (auth + rôle) sont légitimement différents. Aligner « un seul timeout » réintroduirait une attente moins fine. Constantes non mortes.
    - [⊘] **Étape 6 — écartée** : le design la disait « isolée », mais `requireAuthHeaders()`/`getAuthHeaders()` sont appelés **synchronement dans ~50 endroits** ; passer à `getSession()` (async) force un `await` partout → churn massif/risqué pour zéro bug (format cookie Supabase stable).
    - [⊘] **Étape 10 — écartée** : retirer les `sleep` défensifs du flux OAuth popup (non testable ici) risque des races de login pour un gain de perf marginal ; le « store write inutile » ne l'est pas (le fallback non-popup en dépend).
  - Bonus : suppression du code mort `useLastRoomYouTryToJoined`.
  - ⚠️ **À faire par toi avant déploiement** : test manuel des flux OAuth (login Google popup + fallback, refresh de session, logout succès/erreur réseau, multi-onglets) — non couverts par les tests automatisés.

- [⊘] **Simplifier `musics/paginated.get.ts`** 🟡 — *écarté : code complexe mais correct*
  - Investigation : la logique « boundary dates » (lignes 293-406) assure une **pagination stable par date** (le tri secondaire release→artiste→musique est fait côté client car PostgREST ne peut pas trier sur ces relations). Un même groupe de date à cheval sur 2 pages serait incohérent sans elle.
  - Les **tests ne couvrent pas** ce chemin (`orderBy:'name'` et RPC styles le court-circuitent) → « simplifier » donnerait des tests verts tout en supprimant une vraie fonctionnalité = régression masquée.
  - La seule vraie simplification = nouvelle RPC de tri/pagination 100% serveur (gros changement prod + **décision produit** sur l'ordre de tri des ex-æquo). Non fait : risque > valeur pour un non-bug.

- [~] **Découper les pages dashboard monolithiques** 🟡 — *commencé (slice sûr), reste = manuel*
  - [x] `Card/Dashboard/ArtistStats.vue` extrait de `dashboard/artist.vue` (présentationnel, props in, 0 emit/v-model — zéro risque). *(commit `a74c0cf`)*
  - [ ] Reste : extraire `Filters` (7 `v-model` + watchers couplés au fetch) et `Table` (actions edit/delete/ban) pour artist/music/release. ⚠️ **UI sans aucun test** → vérifiable uniquement au typecheck + **test manuel** ; risque de bugs de réactivité ; peu réutilisable (options non uniformes entre pages). Pur gain de maintenabilité (0 bug/perf/sécurité). À faire avec validation manuelle.

---

## Revue PR #60 (CodeRabbit)

Triage des commentaires de revue restés ouverts sur la branche :

- [x] **#1 — `ArtistStats.vue` : `incomplete` pouvait dépasser le total.** Comptait la somme des champs manquants (desc + socials + plateformes + styles). Désormais : 1 par artiste ayant ≥1 champ manquant. *(commit `d2c2ad9`)*
- [x] **#2 — `MobileNavigation.vue` : flash d'état auth.** UI connecté/admin gardée sur `isClient` seulement. Désormais sur `isClient && isReady && isAdmin` (parité avec `navigation.vue`). *(commit `d2c2ad9`)*
- [x] **#6 — `artists/paginated.get.ts` : cache ambigu.** `Cache-Control: no-store` explicite (endpoint auth-gated + par-requête ; override de la règle globale `/api`). *(commit `d2c2ad9`)*
- [x] **#8 — `artists/paginated` : `onlyWithoutSocials/Platforms` appliqués après `range()`** → `total`/pagination faux + pages courtes. Corrigé via RPC `get_paginated_artists` (tous les filtres en SQL, `NOT EXISTS` sur les jonctions, `count(*) OVER()` pour le total, `ORDER BY` par CASE sans SQL dynamique). Migration `20260530000003`, testée en live (totaux exacts, pagination sans chevauchement). REVOKE PUBLIC/anon/authenticated, service_role uniquement.
- [⊘] **#7 — `verified=null` côté validation queue.** Faux positif : `null` = « non vérifiés » est intentionnel (file de modération).
- [⊘] **#10a — ERRCODE de `reorder_ranking_items_atomic`.** Faux positif : `42501` (insufficient_privilege) est valide, vérifié en live.
- [x] **SSRF — `get-page-title`** : `fetch()` suivait les redirections en ne validant que l'URL initiale → un `30x` depuis un domaine autorisé pouvait atteindre une ressource interne/privée (endpoint non authentifié). Corrigé : suivi manuel des redirections (`redirect: 'manual'`) avec revalidation protocole + allowlist à **chaque saut**, cap `MAX_REDIRECTS`, budget timeout global. *(commit `9cb2af3`)*

---

## Notes

- Points **surévalués** lors de l'analyse (à NE PAS traiter comme critiques) :
  - Fuite supposée du secret Supabase côté client → en réalité non exposé (config serveur). Voir Niveau 1 (renommage par hygiène uniquement).
  - « Bypass » du middleware admin via localStorage → cosmétique seulement ; les données restent protégées par `requireAdmin` côté serveur.
- Avant chaque refactor lourd (Niveau 3-4), ajouter/vérifier la couverture de tests (`npm run test:run`).
- Lancer `npm run check` après chaque lot de corrections.
