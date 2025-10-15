import {
	ADMIN_AUTH_INIT_TIMEOUT_MS,
	AUTH_MAX_RETRY_ATTEMPTS,
	AUTH_RETRY_DELAY_MS,
} from '~/constants/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
	const user = useSupabaseUser()
	const userStore = useUserStore()

	// SSR: Vérification simple côté serveur
	if (import.meta.server) {
		if (!user.value) {
			return navigateTo('/authentification')
		}
		// Côté serveur, on ne peut pas vérifier les détails du rôle facilement
		// On laisse passer et vérifie côté client
		return
	}

	// Client: Vérifications complètes
	if (import.meta.client) {
		const { ensureAuthInitialized, userData } = useAuth()

		// Initialisation avec timeout configuré
		try {
			await Promise.race([
				ensureAuthInitialized(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Auth timeout')), ADMIN_AUTH_INIT_TIMEOUT_MS),
				),
			])
		} catch (error) {
			if (!user.value) {
				return navigateTo('/authentification')
			}
		}

		// Attendre les données utilisateur avec retry configuré
		if (!userData.value && user.value) {
			let attempts = 0
			while (!userData.value && attempts < AUTH_MAX_RETRY_ATTEMPTS) {
				await new Promise((resolve) => setTimeout(resolve, AUTH_RETRY_DELAY_MS))
				attempts++
			}
		}
	}

	// Vérifications finales
	if (!user.value) {
		return navigateTo('/authentification')
	}

	const { userData } = useAuth()

	// Vérifier les permissions admin
	if (import.meta.client && (!userData.value || !userStore.isAdminStore)) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Accès refusé. Permissions administrateur requises.',
		})
	}
})
