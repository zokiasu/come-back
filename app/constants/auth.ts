/**
 * Authentication configuration constants
 */

/**
 * Default timeout for the auth initialization (ms)
 * Used by `waitForAuthInitialization` in `app/utils/authSession.ts`
 */
export const AUTH_INIT_TIMEOUT_MS = 5000

/**
 * Maximum timeout for admin initialization (ms)
 * Higher because it requires more checks
 * Used by the `admin.ts` middleware
 */
export const ADMIN_AUTH_INIT_TIMEOUT_MS = 6000

/**
 * Maximum total wait for user data (ms)
 * Used by `waitForUserData` in `app/utils/authSession.ts`
 */
export const AUTH_MAX_WAIT_TIME_MS = 3000
