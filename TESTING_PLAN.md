# Plan d'amélioration des tests

## Etat initial

- Des tests Vitest existaient dans `tests/server/utils`, mais aucun script `test` n'etait declare dans `package.json`.
- Vitest et les utilitaires Nuxt/Vue de test n'etaient pas installes.
- Les imports des tests existants pointaient vers `tests/server/*` au lieu de `server/utils/*`.
- `npm run check` ne couvrait que lint + typecheck, sans execution de tests.
- Les workflows GitHub Actions annoncaient des tests sans lancer de vraie suite.

## Objectif

Mettre en place une base de tests fiable pour Nuxt 4 :

- tests unitaires rapides pour les fonctions pures et utilitaires serveur ;
- tests Nuxt possibles via `@nuxt/test-utils` pour composables, composants et auto-imports ;
- scripts npm clairs pour dev, CI et coverage ;
- premiers tests sur les zones a fort risque de regression.

## Phase 1 - Socle outillage

- Installer `vitest`, `@nuxt/test-utils`, `@vue/test-utils`, `happy-dom` et `@vitest/coverage-v8`.
- Ajouter `vitest.config.ts` avec l'environnement `node` par defaut et les alias du projet.
- Garder `@nuxt/test-utils` disponible pour les tests qui auront besoin de l'environnement Nuxt via `@vitest-environment nuxt`.
- Ajouter `tsconfig.test.json` pour typechecker les tests et les fichiers serveur concernes.
- Ajouter les scripts :
  - `test`
  - `test:run`
  - `test:coverage`
  - `test:typecheck`
- Inclure `test:typecheck` et `test:run` dans `npm run check`.

## Phase 2 - Tests unitaires prioritaires

- Corriger les tests existants sur `transformers` et `errorHandler`.
- Couvrir les helpers critiques :
  - `server/utils/validation.ts`
  - `server/utils/queryFilters.ts`
  - `server/utils/youtubeMvMatcher.ts`
- Verifier les comportements de bord : valeurs nulles, limites de pagination, formats invalides, filtres conditionnels, scoring YouTube.

## Phase 3 - Tests d'integration serveur

Priorite aux endpoints qui modifient des donnees ou aggregent plusieurs relations :

- `server/api/releases/index.post.ts`
- `server/api/releases/[id]/index.patch.ts`
- `server/api/releases/[id]/index.delete.ts`
- `server/api/musics/paginated.get.ts`
- `server/api/calendar/releases.get.ts`
- `server/api/admin/youtube/*`
- `server/api/notifications/*`

Ces tests doivent mocker Supabase et verifier les appels, les rollbacks, les erreurs HTTP et les transformations de jonctions.

## Phase 4 - Tests Nuxt UI/composables

Ajouter progressivement des tests avec `@nuxt/test-utils` :

- middlewares `auth` et `admin` ;
- composables d'authentification et headers Supabase ;
- creation/modification de release ;
- creation artiste et verification YouTube Music ID ;
- recherche globale et selection artiste/musique.

## Phase 5 - E2E

Ajouter Playwright uniquement apres stabilisation du socle unit/integration.
Parcours minimum :

- page d'accueil publique ;
- recherche globale ;
- redirection auth pour routes protegees ;
- acces dashboard refuse sans admin ;
- creation/edition de release en session admin ;
- MV matcher admin.

## Audit applicatif large - flows de test recommandes

L'application ne doit pas etre testee uniquement composant par composant. Les zones les plus sensibles sont les parcours metier qui traversent plusieurs couches : page Nuxt, composable, endpoint Nitro, validation, Supabase, transformation des relations et etat UI.

### Priorite 1 - Parcours public

Objectif : garantir que les visiteurs peuvent consulter les donnees principales sans compte.

- Accueil :
  - charge les dernieres news, releases, artists, musics random et latest MVs ;
  - affiche des etats vides comprehensibles si une API retourne une liste vide ;
  - conserve l'affichage si une section secondaire echoue ;
  - met a jour les listes via realtime sans dupliquer les elements.
- Pages detail :
  - artiste complet avec releases, musics, companies, relations et liens sociaux ;
  - release complete avec artistes, musiques, plateformes et donnees manquantes ;
  - company detail avec artistes lies ;
  - ranking public en lecture seule.
- Listes et recherche :
  - pagination stable ;
  - filtres combinables ;
  - recherche vide ou trop longue ;
  - resultat absent.
- Calendrier :
  - navigation par mois ;
  - releases groupees par date ;
  - mois sans release ;
  - timezone et dates limites.

### Priorite 2 - Authentification et permissions

Objectif : eviter les fuites d'acces et les redirections incoherentes.

- Utilisateur anonyme :
  - redirection depuis les routes protegees ;
  - message ou query `authError=auth_required` ;
  - acces refuse aux routes dashboard.
- Utilisateur connecte standard :
  - acces aux pages settings et ranking personnel ;
  - acces refuse aux pages admin ;
  - preservation de la session apres reload.
- Contributor :
  - acces aux endpoints contributor ;
  - refus sur endpoints admin.
- Admin :
  - acces dashboard ;
  - restauration correcte depuis session Supabase et store Pinia ;
  - comportement stable si les donnees user arrivent en retard.
- Cas limites :
  - session Supabase absente ;
  - store localStorage incomplet ;
  - role invalide ;
  - utilisateur supprime cote base.

### Priorite 3 - Dashboard et CRUD metier

Objectif : couvrir les actions qui modifient la base et les relations many-to-many.

- Releases :
  - creation avec artistes, musiques et platform links ;
  - rollback si l'insertion des relations artistes echoue ;
  - edition des champs principaux ;
  - suppression avec nettoyage des relations ;
  - filtres dashboard, pagination, modales et confirmation delete.
- Artists :
  - creation artiste solo/groupe ;
  - edition des liens sociaux et plateformes ;
  - relations groupe/membre ;
  - verification YouTube Music ID ;
  - approval d'un artiste pending.
- Musics :
  - creation avec artistes ;
  - liaison a une release ;
  - suppression et detachement des relations ;
  - filtres par artiste, release, recherche et date.
- News :
  - creation avec artistes associes ;
  - edition ;
  - suppression ;
  - affichage public apres publication.
- Companies :
  - creation et edition ;
  - liaison artiste-company ;
  - dates de debut/fin ;
  - suppression de liaison.
- MV matcher :
  - scan des candidats ;
  - recherche manuelle ;
  - preview video ;
  - association MV vers music ;
  - gestion des doublons et resultats non pertinents.

### Priorite 4 - API serveur

Objectif : tester les contrats de donnees et les erreurs HTTP sans dependre d'une vraie base.

- Auth helpers :
  - `requireAuth` ;
  - `requireContributor` ;
  - `requireAdmin` ;
  - `requireCronSecret`.
- Validation :
  - limites de recherche ;
  - limites de pagination ;
  - tableaux trop longs ;
  - IDs invalides ;
  - dates et annees hors bornes.
- Endpoints read :
  - releases paginated ;
  - artists latest/search/complete ;
  - musics random/latest-mvs/paginated ;
  - calendar releases ;
  - dashboard overview.
- Endpoints write :
  - creation, edition et suppression releases ;
  - creation, edition et suppression artists ;
  - creation, edition et suppression musics ;
  - creation, edition et suppression news ;
  - liaisons artist/company et music/release.
- Erreurs :
  - erreurs Supabase mappees en erreurs H3 ;
  - not found ;
  - bad request ;
  - forbidden ;
  - rollback partiel.

### Priorite 5 - Notifications, push et cron

Objectif : securiser les flows qui communiquent avec les utilisateurs.

- Settings notifications :
  - subscribe push ;
  - unsubscribe push ;
  - sauvegarde des preferences ;
  - follow/unfollow artistes ;
  - affichage si le navigateur ne supporte pas push.
- Push API :
  - enregistrement endpoint ;
  - suppression endpoint ;
  - endpoint deja existant ;
  - payload invalide.
- Cron :
  - secret invalide refuse ;
  - daily digest ;
  - weekly digest ;
  - notifications artistes suivis ;
  - aucun envoi si opt-out.

### Priorite 6 - Realtime

Objectif : verifier que les donnees live ne cassent pas l'interface.

- Subscription Supabase creee au montage ;
- nettoyage des channels au demontage ;
- insertion news/release/artist/music ;
- update d'un element existant ;
- suppression ou donnees invalides ;
- plusieurs evenements rapides sans duplication.

## Strategie d'execution conseillee

### Unit tests

Utiliser Vitest pour les fonctions pures et les helpers :

- `server/utils/validation.ts` ;
- `server/utils/transformers.ts` ;
- `server/utils/queryFilters.ts` ;
- `server/utils/errorHandler.ts` ;
- `server/utils/youtubeMvMatcher.ts` ;
- helpers d'auth avec evenements H3 mockes.

Ces tests doivent rester rapides, sans Nuxt complet et sans Supabase reel.

### Integration tests API

Tester les endpoints Nitro avec Supabase mocke :

- mock centralise du client Supabase ;
- verification des appels `.select`, `.insert`, `.update`, `.delete`, `.eq`, `.in`, `.rpc` ;
- assertions sur status code, body et rollback ;
- fixtures lisibles pour artistes, releases, musics et news.

Ces tests doivent valider les contrats API que le frontend consomme.

### Component tests Nuxt/Vue

Tester les composants et pages a forte logique :

- formulaires dashboard ;
- modales delete/edit ;
- settings notifications ;
- pagination et filtres ;
- etats loading, empty et error ;
- middlewares `auth` et `admin` avec stores mockes.

Utiliser `@nuxt/test-utils` seulement quand les auto-imports Nuxt ou le contexte runtime sont necessaires.

### E2E Playwright

Ajouter Playwright une fois les tests unitaires et integration stabilises.

Flows E2E minimum :

- visiteur consulte la home et ouvre une release ;
- utilisateur anonyme est redirige depuis une route protegee ;
- utilisateur connecte modifie ses preferences de notifications ;
- admin cree puis edite une release ;
- admin utilise le MV matcher pour lier une video ;
- dashboard refuse l'acces a un non-admin.

Les E2E doivent utiliser des donnees seedees ou des mocks API stables pour eviter une dependance a l'etat de production Supabase.

## Ordre de mise en place recommande

1. Ajouter les tests API pour les endpoints `releases`, car ils couvrent creation, relations et rollback.
2. Ajouter les tests API pour `artists` et `musics`, surtout les relations many-to-many.
3. Couvrir les middlewares `auth` et `admin`.
4. Tester les formulaires dashboard critiques avec Vue Test Utils.
5. Ajouter un premier scenario Playwright public.
6. Ajouter un scenario Playwright admin uniquement quand les seeds/mocks sont stables.

## Definition de done

- `npm run lint:check` passe.
- `npm run typecheck` passe.
- `npm run test:typecheck` passe.
- `npm run test:run` passe.
- `npm run check` lance toute la suite locale.
- Les workflows CI utilisent `npm run check` au lieu d'une verification partielle.
