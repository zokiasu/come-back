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

## Definition de done

- `npm run lint:check` passe.
- `npm run typecheck` passe.
- `npm run test:typecheck` passe.
- `npm run test:run` passe.
- `npm run check` lance toute la suite locale.
- Les workflows CI utilisent `npm run check` au lieu d'une verification partielle.
