/**
 * Authentication configuration constants
 */

/**
 * Maximum timeout for auth initialization (ms)
 * Used by the `auth.ts` middleware
 */
export const AUTH_INIT_TIMEOUT_MS = 5000

/**
 * Maximum timeout for admin initialization (ms)
 * Higher because it requires more checks
 * Used by the `admin.ts` middleware
 */
export const ADMIN_AUTH_INIT_TIMEOUT_MS = 6000

/**
 * Maximum number of attempts to fetch user data
 * Used by the `admin.ts` middleware
 */
export const AUTH_MAX_RETRY_ATTEMPTS = 30

/**
 * Delay between user data fetch attempts (ms)
 * Used by the `admin.ts` middleware
 */
export const AUTH_RETRY_DELAY_MS = 100

/**
 * Maximum total wait time for user data (ms)
 * Calculated as `AUTH_MAX_RETRY_ATTEMPTS * AUTH_RETRY_DELAY_MS = 3000ms`
 */
export const AUTH_MAX_WAIT_TIME_MS = AUTH_MAX_RETRY_ATTEMPTS * AUTH_RETRY_DELAY_MS
