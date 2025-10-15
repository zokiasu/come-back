/**
 * Constantes de configuration pour l'authentification
 */

/**
 * Timeout maximum pour l'initialisation de l'auth (ms)
 * Utilisé dans auth.ts middleware
 */
export const AUTH_INIT_TIMEOUT_MS = 2000

/**
 * Timeout maximum pour l'initialisation admin (ms)
 * Plus élevé car nécessite plus de vérifications
 * Utilisé dans admin.ts middleware
 */
export const ADMIN_AUTH_INIT_TIMEOUT_MS = 3000

/**
 * Nombre maximum de tentatives pour récupérer les données utilisateur
 * Utilisé dans admin.ts middleware
 */
export const AUTH_MAX_RETRY_ATTEMPTS = 15

/**
 * Délai entre chaque tentative de récupération des données (ms)
 * Utilisé dans admin.ts middleware
 */
export const AUTH_RETRY_DELAY_MS = 100

/**
 * Durée totale maximale d'attente pour les données utilisateur (ms)
 * Calculé: AUTH_MAX_RETRY_ATTEMPTS * AUTH_RETRY_DELAY_MS = 1500ms
 */
export const AUTH_MAX_WAIT_TIME_MS = AUTH_MAX_RETRY_ATTEMPTS * AUTH_RETRY_DELAY_MS
