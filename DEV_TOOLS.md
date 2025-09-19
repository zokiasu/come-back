# 🔧 Outils de développement

Ce fichier décrit les outils de développement et de debugging disponibles dans cette application.

## 📋 Pages de debug (Développement uniquement)

Ces pages ne sont accessibles qu'en mode développement (`NODE_ENV=development`).

### `/debug`

- **Description**: Page de debug complète avec tests de connexion
- **Fonctionnalités**:
  - Informations sur l'environnement d'exécution
  - Test de la configuration Supabase
  - Test d'authentification
  - Tests de connexion Supabase et recherche full-text
- **Utilisation**: Accessible uniquement en développement local

### `/debug-simple`

- **Description**: Page de debug simplifiée
- **Fonctionnalités**:
  - Informations environnement de base
  - Test de configuration runtime
  - Tests basiques de connexion
- **Utilisation**: Version allégée pour tests rapides

### `/test`

- **Description**: Page de test basique
- **Fonctionnalités**:
  - Validation que le routage fonctionne
  - Affichage timestamp simple
- **Utilisation**: Test minimal de fonctionnement

## 🛠️ Composables utiles

### `useErrorLogger`

- **Localisation**: `app/composables/useErrorLogger.ts`
- **Fonctionnalités**:
  - Logging d'erreurs avec contexte
  - Logging d'informations
  - Comportement différent dev/prod :
    - **Développement**: Logs détaillés avec stack trace
    - **Production**: Logs minimaux uniquement
- **Utilisation**:
  ```typescript
  const { logError, logInfo } = useErrorLogger()
  logError(error, 'context-name')
  logInfo('Information message', data)
  ```

## 🔌 Plugins de monitoring

### `error-handler.client.ts`

- **Fonctionnalité**: Capture les erreurs JavaScript globales côté client
- **Scope**:
  - Erreurs JavaScript non capturées
  - Rejets de promesses non gérées
  - Erreurs Vue.js

### `error-handler.server.ts`

- **Fonctionnalité**: Capture les erreurs côté serveur (SSR)
- **Scope**:
  - Erreurs Vue.js côté serveur
  - Erreurs de rendu

## 🚀 Utilisation

### En développement

```bash
npm run dev
# Pages disponibles:
# - http://localhost:3000/debug
# - http://localhost:3000/debug-simple
# - http://localhost:3000/test
```

### En production

- Pages de debug automatiquement désactivées (404)
- Logging minimal activé
- Monitoring d'erreurs actif

## 📝 Notes

- Les outils sont conçus pour ne pas impacter les performances en production
- Les logs sont différenciés entre développement et production
- Les pages de debug sont complètement inaccessibles en production
- `useErrorLogger` peut être étendu pour intégrer des services de logging externes (Sentry, LogRocket, etc.)
