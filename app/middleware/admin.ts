import {
	ADMIN_AUTH_INIT_TIMEOUT_MS,
	AUTH_MAX_RETRY_ATTEMPTS,
	AUTH_RETRY_DELAY_MS,
} from '~/constants/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
	const user = useSupabaseUser()
	const userStore = useUserStore()

	// SSR: Laisser passer, la vérification complète se fait côté client
	// Les pages dashboard sont en mode SPA (ssr: false) donc ce code ne devrait pas s'exécuter
	if (import.meta.server) {
		return
	}

	// Client: Vérifications complètes
	const { ensureAuthInitialized, userData } = useAuth()

	// Attendre l'initialisation de l'auth (restauration session + localStorage)
	try {
		await Promise.race([
			ensureAuthInitialized(),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Auth timeout')), ADMIN_AUTH_INIT_TIMEOUT_MS),
			),
		])
	} catch {
		// Timeout - continuer avec les vérifications
	}

	// Attendre que les données utilisateur soient disponibles
	// (soit depuis Supabase, soit depuis localStorage via Pinia)
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

	// Vérifier les permissions admin
	const isAdmin = userStore.isAdminStore || userData.value?.role === 'ADMIN'

	if (!isAdmin) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Accès refusé. Permissions administrateur requises.',
		})
	}
})
