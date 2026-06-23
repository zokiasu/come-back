# Rapport d'audit de securite

## Synthese

Audit effectue sur le code Nuxt 4 / Supabase et sur les advisors de securite du projet Supabase connecte.

Le risque le plus urgent est une elevation de privileges directe cote Supabase: `public.users.role` est modifiable par les utilisateurs authentifies avec la policy RLS actuelle, alors que l'API serveur fait confiance a cette colonne pour `requireAdmin` et `requireContributor`. J'ai aussi trouve des patterns de mass assignment sur les champs `verified`, une exposition de tokens dans le callback OAuth, une validation insuffisante des URLs externes, et plusieurs warnings Supabase a corriger.

Ordre de priorite:

1. Corriger immediatement l'exposition de `public.users.role`.
2. Restreindre les payloads create/update cote serveur et rendre les transitions de verification admin-only si c'est bien le workflow attendu.
3. Supprimer les logs OAuth contenant l'URL complete et eviter de stocker access/refresh tokens dans `localStorage`.
4. Ajouter une allowlist de protocoles pour les liens externes avant stockage et rendu.
5. Appliquer les remediations Supabase advisors et ajouter les headers de securite / CSP.

## Critique

### SEC-001: Un utilisateur authentifie peut probablement promouvoir son propre role

- Severite: Critique
- Rule ID: AUTHZ-ROLE-001
- Emplacement:
  - `server/utils/auth.ts:55` a `server/utils/auth.ts:69`
  - `app/composables/useSupabaseFunction.ts:9` a `app/composables/useSupabaseFunction.ts:17`
  - Policies/grants Supabase production sur `public.users`
- Preuve:
  - `requireAdmin` / `requireContributor` lisent le role depuis `public.users` dans `server/utils/auth.ts:55` a `server/utils/auth.ts:69`.
  - `updateUserData` propage tout l'objet `User` client dans l'update: `const updateData: Partial<User> = { ...user, updated_at: ... }`, puis ecrit dans `users` dans `app/composables/useSupabaseFunction.ts:11` a `app/composables/useSupabaseFunction.ts:17`.
  - Policy Supabase observee en production: `Users can update own profile`, `USING (auth.uid() = id)`, `WITH CHECK (auth.uid() = id)`.
  - Privileges de colonnes observes en production: `authenticated` a `UPDATE` sur `public.users.role`.
- Impact: Tout utilisateur connecte pouvant appeler l'API Supabase REST directement peut mettre son propre `role` a `ADMIN` ou `CONTRIBUTOR`, puis passer les guards serveur parce qu'ils font confiance a `public.users.role`.
- Correctif:
  - Revoquer l'`UPDATE` direct sur `public.users.role` pour `anon` et `authenticated`.
  - Remplacer la policy large d'update profil par un endpoint serveur ou des grants de colonnes limitant a `name`, `email`, `photo_url`, `updated_at`.
  - Retirer `role` des payloads d'update client; `updateUserData` doit selectionner explicitement les champs autorises.
  - Ajouter un trigger DB qui interdit les changements de `role` sauf chemin service-role/admin.
- Mitigation: Apres correction, auditer les roles existants, car ce probleme touche la source d'autorite utilisee par l'API.
- Note faux positif: ce risque serait mitige uniquement si une autre couche invisible bloque `UPDATE role`. Les privileges de colonnes observes indiquent que `authenticated` peut actuellement l'updater.

## Eleve

### SEC-002: Mass assignment contributor-level sur des champs sensibles

- Severite: Elevee
- Rule ID: AUTHZ-MASS-001
- Emplacement:
  - `server/api/artists/[id]/approve.patch.ts:1` a `server/api/artists/[id]/approve.patch.ts:10`
  - `server/api/releases/[id]/index.patch.ts:23` a `server/api/releases/[id]/index.patch.ts:26`
  - `server/api/musics/[id]/index.patch.ts:23` a `server/api/musics/[id]/index.patch.ts:26`
  - `server/api/news/[id]/index.patch.ts:22` a `server/api/news/[id]/index.patch.ts:26`
  - `server/api/companies/[id]/index.patch.ts:15` a `server/api/companies/[id]/index.patch.ts:17`
- Preuve:
  - La page de validation est admin-only dans `app/pages/dashboard/validation.vue:295` a `app/pages/dashboard/validation.vue:296`.
  - L'endpoint d'approbation utilise `await requireContributor(event)` puis update `{ verified: true }`.
  - Plusieurs endpoints `PATCH` passent directement `body.updates` ou `body.data` a `.update(...)`, ce qui accepte toute colonne writable envoyee dans la requete HTTP.
- Impact: Un `CONTRIBUTOR` peut appeler directement les endpoints backend pour approuver des artistes ou mettre `verified` sur releases, musics, news et companies si le champ est dans le payload. Il peut aussi modifier des champs operationnels non prevus par l'UI.
- Correctif:
  - Valider chaque endpoint serveur avec un schema (`zod` ou equivalent).
  - Faire un allowlist explicite des champs cote serveur au lieu de forwarder `TablesInsert` / `TablesUpdate`.
  - Isoler les champs de moderation comme `verified` dans des endpoints admin-only proteges par `requireAdmin`.
  - Ajouter des tests prouvant qu'un contributor ne peut pas modifier `verified`.
- Mitigation: Si les contributors sont volontairement des moderateurs de confiance, documenter ce choix et baisser la severite a Moyenne. L'UI actuelle suggere toutefois un workflow admin-only.

### SEC-003: Le callback OAuth logge des URLs avec tokens et stocke des tokens de session

- Severite: Elevee
- Rule ID: VUE-HTTP-001 / JS-STORAGE-001
- Emplacement:
  - `app/pages/auth/callback.vue:44` a `app/pages/auth/callback.vue:45`
  - `app/pages/auth/callback.vue:51` a `app/pages/auth/callback.vue:54`
  - `app/pages/auth/callback.vue:221` a `app/pages/auth/callback.vue:248`
  - `app/composables/auth/supabase-auth.composable.ts:189` a `app/composables/auth/supabase-auth.composable.ts:205`
- Preuve:
  - Le callback logge `Full URL: ${window.location.href}`.
  - Le callback lit `access_token` et `refresh_token` depuis le hash.
  - Il envoie les tokens de session par `postMessage` et ecrit `sessionTokens` dans `localStorage` sous `comeback-auth`.
- Impact: Access token et refresh token peuvent fuiter via console navigateur, outils de debug, extensions, XSS, ou rester dans `localStorage` si le chemin de cleanup opener/storage echoue.
- Correctif:
  - Supprimer le log de l'URL complete et ne jamais logger d'URL/payload OAuth contenant des tokens.
  - Preferer le flux PKCE code flow et laisser Supabase synchroniser la session via son mecanisme normal.
  - Utiliser `postMessage` / storage uniquement pour signaler un statut, jamais pour transporter access/refresh tokens bruts.
  - Si un fallback reste necessaire, ne pas stocker le refresh token et supprimer le payload immediatement avec une verification stricte de timestamp.
- Mitigation: CSP/Trusted Types reduisent le blast radius XSS, mais ne rendent pas le stockage de tokens sur.

### SEC-004: Les liens externes stockes ne filtrent pas les protocoles avant rendu

- Severite: Elevee
- Rule ID: VUE-XSS-004 / JS-URL-002
- Emplacement:
  - `app/composables/useLinkManager.ts:65` a `app/composables/useLinkManager.ts:68`
  - `app/composables/useLinkManager.ts:122` a `app/composables/useLinkManager.ts:124`
  - `app/components/Comeback/ExternalLink.vue:2` a `app/components/Comeback/ExternalLink.vue:6`
  - `app/pages/artist/[id].vue:341` a `app/pages/artist/[id].vue:367`
  - `app/pages/release/[id].vue:184` a `app/pages/release/[id].vue:191`
  - `app/components/Card/Dashboard/Company.vue:75` a `app/components/Card/Dashboard/Company.vue:77`
- Preuve:
  - `isValidUrl` verifie seulement `new URL(url)`, qui accepte aussi des schemes actifs.
  - `filterValidLinks` verifie seulement que `name` et `link` ne sont pas vides.
  - Les liens stockes sont rendus dans `NuxtLink :to="link"`, `href`, ou `window.open(...)`.
- Impact: Un contributor malveillant ou un compte compromis peut stocker une URL dangereuse dans les liens artiste/release/company. Au clic par un admin ou utilisateur public, une navigation a scheme actif peut executer du script dans l'origine de l'application selon le navigateur et le composant.
- Correctif:
  - Ajouter un helper partage `normalizeExternalUrl` acceptant uniquement `https:` et, si necessaire, `http:` en dev/localhost.
  - Valider cote serveur avant insert/update et revalider avant rendu.
  - Pour les plateformes connues, envisager une allowlist de hosts.
- Mitigation: CSP aide, mais la validation de scheme reste obligatoire.

## Moyen

### SEC-005: Des fonctions Supabase SECURITY DEFINER sont executables par anon/authenticated

- Severite: Moyenne
- Rule ID: SUPABASE-RPC-001
- Emplacement: Supabase production advisors et ACLs de fonctions
- Preuve:
  - Advisors: execution anon/authenticated pour `add_artist_creation_contribution`, `get_user_role`, `handle_new_user`, `is_admin`, `is_contributor_or_admin`, `is_supabase_or_firebase_project_jwt`.
  - ACLs observees: `anon=X` et `authenticated=X` sur ces fonctions.
- Impact: Des fonctions `SECURITY DEFINER` exposees augmentent le blast radius de futurs bugs de fonctions et rendent les frontieres de privilege plus difficiles a raisonner. Certaines fonctions actuelles semblent read-only/no-op, mais elles restent exposees via PostgREST RPC.
- Correctif:
  - Revoquer `EXECUTE` a `PUBLIC`, `anon` et `authenticated` pour les fonctions qui ne doivent pas etre publiques.
  - Pour les helpers RLS, conserver l'execution uniquement si necessaire et documenter le besoin.
  - Garder un `search_path` fixe sur toute fonction `SECURITY DEFINER`.
- Mitigation: Lancer regulierement les advisors Supabase et faire echouer le deploiement sur toute nouvelle fonction definer exposee.

### SEC-006: La policy insert de `user_notifications` est effectivement publique

- Severite: Moyenne
- Rule ID: SUPABASE-RLS-001
- Emplacement: Policy Supabase production sur `public.user_notifications`
- Preuve:
  - Advisor: `Service role can insert notifications` avec `WITH CHECK (true)`.
  - Query policy production: roles `{public}`, commande `INSERT`, `with_check: true`.
  - Les notifications serveur sont inserees avec service role dans `server/utils/notificationSender.ts:208`.
- Impact: Si les grants de table autorisent l'insert pour anon/authenticated, des appelants peuvent creer des notifications pour n'importe quel utilisateur: spam, spoofing de notifications, contenu de phishing dans l'app.
- Correctif:
  - Supprimer la policy insert publique. Le service role bypass RLS et n'en a pas besoin.
  - Si un insert client est necessaire, limiter a `TO authenticated WITH CHECK (auth.uid() = user_id)` et valider message/type cote serveur.
- Mitigation: Apres correction, verifier les notifications existantes pour detecter du contenu inattendu.

### SEC-007: Headers de securite non visibles et CORS API large

- Severite: Moyenne
- Rule ID: VUE-HEADERS-001 / JS-CSP-001
- Emplacement:
  - `nuxt.config.ts:117` a `nuxt.config.ts:120`
  - `vercel.json:1` a `vercel.json:16`
  - `nuxt.config.ts:206` a `nuxt.config.ts:210`
- Preuve:
  - `/api/**` configure `cors: true` et seulement `Cache-Control: no-store`.
  - `vercel.json` ne contient que les crons; aucun header visible.
  - Seule une meta COOP est visible dans le head; pas de CSP, `frame-ancestors` / `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, ou `Permissions-Policy` dans le repo.
- Impact: La defense en profondeur contre XSS et clickjacking est faible, et CORS expose inutilement la surface API cross-origin.
- Correctif:
  - Ajouter des headers au niveau deploiement: CSP, `frame-ancestors 'none'` ou origines de confiance, `X-Content-Type-Options: nosniff`, `Referrer-Policy` stricte, `Permissions-Policy` minimale.
  - Remplacer `cors: true` global par une allowlist explicite de l'origine de production.
- Mitigation: Si ces headers sont configures hors repo, les verifier runtime et documenter la source de verite.

### SEC-008: Warnings de hardening Supabase encore ouverts

- Severite: Moyenne
- Rule ID: SUPABASE-CONFIG-001
- Emplacement: Supabase production advisors
- Preuve:
  - `function_search_path_mutable` sur `public.get_paginated_musics_by_styles`.
  - Extensions `http` et `pg_net` installees dans `public`.
  - Expiration OTP email superieure a une heure.
  - Leaked password protection desactivee.
  - Version Postgres actuelle avec security patches disponibles.
- Impact: Ce sont surtout des sujets de defense en profondeur et hygiene plateforme. Le patch Postgres et la protection contre mots de passe compromis sont les plus importants operationnellement.
- Correctif:
  - Fixer `search_path` sur la fonction.
  - Deplacer les extensions hors de `public` si faisable.
  - Reduire l'expiration OTP sous une heure.
  - Activer leaked password protection.
  - Planifier l'upgrade Supabase Postgres.

## Faible

### SEC-009: L'audit de dependances signale des packages transitifs vulnerables

- Severite: Faible en runtime production, Moyenne pour tooling/build
- Rule ID: VUE-SUPPLY-001
- Emplacement: `package.json`, installation npm locale
- Preuve:
  - `npm audit` sur l'arbre complet remonte 14 vulnerabilites: 1 critique, 4 elevees, 6 moyennes, 3 faibles.
  - `npm audit --omit=dev` remonte seulement 1 vulnerabilite faible en production (`esbuild`, liee au dev server).
  - Exemples dans l'arbre complet: `shell-quote` critique, `serialize-javascript` elevee, `js-cookie` elevee, `fast-uri` elevee, principalement transitif/tooling.
- Impact: L'exposition runtime semble faible d'apres `--omit=dev`, mais l'outillage build/dev compte en CI et sur les environnements developpeur.
- Correctif:
  - Lancer `npm audit fix` ou mettre a jour les packages parents, puis `npm run check`.
  - Ajouter/maintenir un scan dependances en CI.

### SEC-010: Lockfile et migrations Supabase ignores par Git

- Severite: Faible a Moyenne
- Rule ID: SUPPLY-REPRO-001
- Emplacement:
  - `.gitignore:7`
  - `.gitignore:34`
  - `supabase/migrations/20260530000001_secure_exposed_rpcs.sql:19` a `supabase/migrations/20260530000001_secure_exposed_rpcs.sql:32`
- Preuve:
  - `.gitignore` ignore `package-lock.json`.
  - `.gitignore` ignore `supabase/migrations/`.
  - Des migrations de securite existent localement mais ne sont pas trackees.
- Impact: La resolution des dependances et les correctifs de securite database ne sont pas reproductibles depuis le repo. Des patches peuvent etre perdus entre machines ou deploiements.
- Correctif:
  - Commit `package-lock.json` pour rendre npm reproductible.
  - Commit les migrations Supabase ou deplacer les migrations schema/securite dans un chemin de deploiement tracke.
  - Ne pas garder des changements de securite uniquement dans des fichiers ignores.

## Points positifs

- Les endpoints serveur utilisent globalement `requireAuth`, `requireContributor`, `requireAdmin` ou `requireCronSecret`.
- Les secrets cron utilisent une comparaison constant-time dans `server/utils/auth.ts:164` a `server/utils/auth.ts:170`.
- Les endpoints publics filtrent souvent les artistes/releases verifies.
- `get-page-title` allowlist les domaines et revalide les redirections, ce qui reduit le risque SSRF.
- Je n'ai pas trouve de patterns larges `v-html`, `eval`, `document.write` ou injection dynamique de scripts dans le code principal.

## Sequence de remediation recommandee

1. Appliquer une migration Supabase pour `public.users.role` immediatement et retirer `role` des payloads client.
2. Ajouter des schemas et allowlists de champs sur tous les endpoints create/update; isoler `verified` derriere `requireAdmin`.
3. Supprimer le logging et le transfert localStorage de tokens OAuth.
4. Ajouter une allowlist de protocoles dans les helpers de liens et les validators serveur.
5. Corriger les advisors Supabase, surtout l'insert public de notifications et les fonctions definer exposees.
6. Ajouter les headers de securite production et restreindre CORS.
7. Commit le lockfile npm et les migrations Supabase, puis mettre a jour les dependances.
