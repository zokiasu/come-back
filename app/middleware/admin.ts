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

		// Initialisation rapide
		try {
			await Promise.race([
				ensureAuthInitialized(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Auth timeout')), 3000),
				),
			])
		} catch (error) {
			if (!user.value) {
				return navigateTo('/authentification')
			}
		}

		// Attendre les données utilisateur avec timeout réduit
		if (!userData.value && user.value) {
			let attempts = 0
			while (!userData.value && attempts < 15) {
				// 1.5s max
				await new Promise((resolve) => setTimeout(resolve, 100))
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
