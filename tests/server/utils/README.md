# Server Utils Tests

Ce dossier contient les tests unitaires pour les utilitaires serveur du projet.

## 🎯 Couverture actuelle

- `transformers.test.ts` - `transformJunction()`, `batchTransform()`
- `errorHandler.test.ts` - type guards et fabriques d'erreurs (404/400/500)
- `auth.test.ts` - `getAuthenticatedUser()`, `requireAuth`, `requireContributor`,
  `requireAdmin`, `requireCronSecret`
- `validation.test.ts` - validation des entrées (search, arrays, ids, pagination, années)
- `queryFilters.test.ts` - filtres de requêtes partagés
- `rateLimit.test.ts` - limiteur mémoire, store Redis distribué et presets
- `notificationSender.test.ts`, `youtubeMvMatcher.test.ts` - logique métier associée

Les endpoints API sont testés dans `tests/server/api/**` et les composables client
dans `tests/app/**`. Le flow e2e principal est couvert par
`tests/e2e/search-navigation.spec.ts`.

## 🚀 Exécution des Tests

```bash
npm run test        # Mode watch (développement)
npm run test:run    # Une seule fois
npm run test:coverage
npm run test:e2e
```

La configuration est centralisée dans `vitest.config.ts` (environnement `node`,
alias `~`/`#server`, seuils de couverture).

## 📝 Conventions

- **Fichiers de test** : `*.test.ts` sous `tests/`, en miroir de `app/` et `server/`
- **Nomenclature** : `describe()` pour les fonctions, `it()` pour les cas de test
- **Isolation** : `vi.resetModules()` et `vi.stubGlobal()` pour simuler les
  auto-imports Nuxt et les clients Supabase

## ✅ Reste à couvrir

- [ ] Tests de composants Vue (nécessite un environnement Nuxt/happy-dom dédié)
- [ ] Cas d'autorisation croisés sur tous les endpoints conditionnels (`verified=false`)
- [ ] Endpoints cron (`server/api/cron/**`) et `musics/filter-artists`
