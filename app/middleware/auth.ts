import { AUTH_INIT_TIMEOUT_MS, AUTH_MAX_RETRY_ATTEMPTS, AUTH_RETRY_DELAY_MS } from '~/constants/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
	const user = useSupabaseUser()
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

	// Attendre que les données utilisateur soient disponibles
	let attempts = 0
	while (
		!userData.value &&
		!userStore.userDataStore &&
		attempts < AUTH_MAX_RETRY_ATTEMPTS
	) {
		await new Promise((resolve) => setTimeout(resolve, AUTH_RETRY_DELAY_MS))
		attempts++
	}

	// Vérifier la connexion (Supabase OU données persistées dans le store)
	const isAuthenticated = !!user.value?.id || (!!userStore.userDataStore && userStore.isLoginStore)

	if (!isAuthenticated) {
		return navigateTo('/authentification')
	}
})
