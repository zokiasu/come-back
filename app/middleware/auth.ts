import { AUTH_INIT_TIMEOUT_MS } from '~/constants/auth'

export default defineNuxtRouteMiddleware(async (_to, _from) => {
	const user = useSupabaseUser()
	const supabase = useSupabaseClient()
	const userStore = useUserStore()

	// SSR: allow through; the full check runs client-side
	if (import.meta.server) {
		return
	}

	// Client: Wait for the initialisation
	const { ensureAuthInitialized, userData } = useAuth()

	// Wait for the initialisation the auth (restauration session + localStorage)
	try {
		await Promise.race([
			ensureAuthInitialized(),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Auth timeout')), AUTH_INIT_TIMEOUT_MS),
			),
		])
	} catch {
		// On timeout, continue with the remaining checks
	}

	let sessionUserId = user.value?.id ?? null

	if (!sessionUserId) {
		try {
			const { data } = await supabase.auth.getSession()
			sessionUserId = data.session?.user?.id ?? null
		} catch {
			// Use the persisted store as the fallback source.
		}
	}

	const hasUserProfile = !!userData.value || !!userStore.userDataStore || !!sessionUserId
	const hasPersistedSession = !!userStore.userDataStore && userStore.isLoginStore
	const isAuthenticated = !!sessionUserId || hasPersistedSession

	if (!isAuthenticated || !hasUserProfile) {
		return navigateTo('/?authError=auth_required')
	}
})
