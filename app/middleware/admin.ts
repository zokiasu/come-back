export default defineNuxtRouteMiddleware(async (to, from) => {
	// Côté client, attendre l'initialisation de l'auth
	if (import.meta.client) {
		const { ensureAuthInitialized, userData } = useAuth()

		try {
			// Attendre que l'auth soit initialisée (timeout de 5s)
			await Promise.race([
				ensureAuthInitialized(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Auth timeout')), 5000),
				),
			])
		} catch (error) {
			return navigateTo('/authentification')
		}

		// Attendre que les données utilisateur soient chargées
		// Utiliser une promesse avec un timeout plus long
		try {
			await Promise.race([
				// Attendre que userData soit disponible
				new Promise((resolve) => {
					const checkUserData = () => {
						if (userData.value) {
							resolve(true)
						} else {
							setTimeout(checkUserData, 100)
						}
					}
					checkUserData()
				}),
				// Timeout de 10 secondes
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('UserData timeout')), 10000),
				),
			])
		} catch (error) {
			// Ne pas rediriger immédiatement, laisser les vérifications suivantes décider
		}
	}

	// D'abord vérifier si l'utilisateur est connecté
	const user = useSupabaseUser()

	if (!user.value) {
		return navigateTo('/authentification')
	}

	// Ensuite vérifier les permissions admin depuis le store
	const userStore = useUserStore()
	const { userData } = useAuth()

	// Si on a un utilisateur Supabase mais pas encore les données utilisateur,
	// attendre un peu plus avant de rediriger
	if (!userData.value && user.value) {
		// Dernière tentative d'attendre les données utilisateur
		let finalAttempts = 0
		while (!userData.value && finalAttempts < 30) {
			// 3 secondes supplémentaires
			await new Promise((resolve) => setTimeout(resolve, 100))
			finalAttempts++
		}

		// Si toujours pas de données après cette attente, rediriger
		if (!userData.value) {
			return navigateTo('/authentification')
		}
	}

	// Si pas d'utilisateur du tout, rediriger vers auth
	if (!userData.value) {
		return navigateTo('/authentification')
	}

	// Vérifier les permissions admin
	if (!userStore.isAdminStore) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Accès refusé. Permissions administrateur requises.',
		})
	}
})
