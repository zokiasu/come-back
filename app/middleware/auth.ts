import { AUTH_INIT_TIMEOUT_MS } from '~/constants/auth'

export default defineNuxtRouteMiddleware(async (_to, _from) => {
	const user = useSupabaseUser()
	const supabase = useSupabaseClient()
	const userStore = useUserStore()

	// SSR: Laisser passer, la vérification complète se fait côté client
	if (import.meta.server) {
		return
	}

	// Client: Attendre l'initialisation
	const { ensureAuthInitialized, userData } = useAuth()

	// Attendre l'initialisation de l'auth (restauration session + localStorage)
	try {
		await Promise.race([
			ensureAuthInitialized(),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Auth timeout')), AUTH_INIT_TIMEOUT_MS),
			),
		])
	} catch {
		// Timeout - continuer avec les vérifications
	}

	let sessionUserId = user.value?.id ?? null

	if (!sessionUserId) {
		try {
			const { data } = await supabase.auth.getSession()
			sessionUserId = data.session?.user?.id ?? null
		} catch {
			// On s'appuie alors sur le store persisté.
		}
	}

	const hasUserProfile = !!userData.value || !!userStore.userDataStore || !!sessionUserId
	const hasPersistedSession = !!userStore.userDataStore && userStore.isLoginStore
	const isAuthenticated = !!sessionUserId || hasPersistedSession

	if (!isAuthenticated || !hasUserProfile) {
		return navigateTo('/?authError=auth_required')
	}
})
