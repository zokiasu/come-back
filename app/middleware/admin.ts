import {
	ADMIN_AUTH_INIT_TIMEOUT_MS,
	AUTH_MAX_RETRY_ATTEMPTS,
	AUTH_RETRY_DELAY_MS,
} from '~/constants/auth'

export default defineNuxtRouteMiddleware(async (_to, _from) => {
	const user = useSupabaseUser()
	const userStore = useUserStore()

	// SSR: allow through; the full check runs client-side
	// Dashboard pages run in SPA mode (ssr: false), so this code should not execute
	if (import.meta.server) {
		return
	}

	// client-side checks
	const { ensureAuthInitialized, userData } = useAuth()

	// Wait for the initialisation the auth (restauration session + localStorage)
	try {
		await Promise.race([
			ensureAuthInitialized(),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Auth timeout')), ADMIN_AUTH_INIT_TIMEOUT_MS),
			),
		])
	} catch {
		// On timeout, continue with the remaining checks
	}

	// Wait until user data is available
	// (either from Supabase or from `localStorage` through Pinia)
	let attempts = 0
	while (
		!userData.value &&
		!userStore.userDataStore &&
		attempts < AUTH_MAX_RETRY_ATTEMPTS
	) {
		await new Promise((resolve) => setTimeout(resolve, AUTH_RETRY_DELAY_MS))
		attempts++
	}

	// Check authentication (Supabase or persisted store data)
	const isAuthenticated =
		!!user.value?.id || (!!userStore.userDataStore && userStore.isLoginStore)

	if (!isAuthenticated) {
		return navigateTo('/?authError=auth_required')
	}

	// Check the permissions admin
	const isAdmin = userStore.isAdminStore || userData.value?.role === 'ADMIN'

	if (!isAdmin) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Accès refusé. Permissions administrateur requises.',
		})
	}
})
