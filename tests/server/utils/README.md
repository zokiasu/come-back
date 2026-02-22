# Server Utils Tests

Ce dossier contient les tests unitaires pour les utilitaires serveur du projet.

## 🎯 Tests Coverage

### transformers.test.ts

Tests pour les fonctions de transformation de données :

- `transformJunction()` - Extraction d'entités depuis les tables de jonction
- `batchTransform()` - Transformation en masse d'éléments

### errorHandler.test.ts

Tests pour les utilitaires de gestion d'erreurs :

- `isPostgrestError()` - Type guard pour erreurs PostgreSQL
- `createNotFoundError()` - Création d'erreurs 404
- `createBadRequestError()` - Création d'erreurs 400
- `createInternalError()` - Création d'erreurs 500

## 🚀 Exécution des Tests

### Installation de Vitest (si nécessaire)

```bash
npm install -D vitest @vitest/ui
```

### Configuration Vitest

Créer `vitest.config.ts` à la racine :

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			exclude: ['node_modules/', '.nuxt/', '.output/'],
		},
	},
	resolve: {
		alias: {
			'~': path.resolve(__dirname, './'),
			'@': path.resolve(__dirname, './'),
		},
	},
})
```

### Ajouter les scripts dans package.json

```json
{
	"scripts": {
		"test": "vitest",
		"test:ui": "vitest --ui",
		"test:coverage": "vitest --coverage"
	}
}
```

### Lancer les tests

```bash
# Mode watch (recommandé pour le développement)
npm run test

# Une seule fois
npm run test -- --run

# Avec interface UI
npm run test:ui

# Avec coverage
npm run test:coverage
```

## 📝 Conventions

- **Fichiers de test** : `*.test.ts` ou `*.spec.ts`
- **Structure** : Suivre la structure des fichiers sources
- **Nomenclature** : describe() pour les fonctions, it() pour les cas de test
- **Assertions** : Utiliser `expect()` de Vitest

## ✅ Tests à Ajouter

Les tests suivants devraient être ajoutés progressivement :

- [ ] `supabase.test.ts` - Tests pour le client Supabase singleton
- [ ] Tests d'intégration pour les endpoints API
- [ ] Tests E2E avec Playwright pour les flows critiques
- [ ] Tests de performance pour les requêtes N+1

## 🔍 Pourquoi ces Tests ?

Suite à la code review, plusieurs problèmes ont été identifiés :

1. Bug de table de jonction détecté uniquement en manuel (`calendar/releases`)
2. Absence de filet de sécurité pour les refactorings futurs
3. Difficulté à valider les edge cases

Ces tests assurent que :

- Les transformations de données fonctionnent correctement
- La gestion d'erreurs est robuste
- Les régressions sont détectées automatiquement
