export default defineNuxtPlugin(async () => {
	// Plugin d'initialisation de l'authentification côté client
	if (import.meta.client) {
		// Ne pas initialiser sur la page de callback pour éviter les conflits
		const route = useRoute()
		if (route.path === '/auth/callback') {
			return
		}

		// Attendre que Nuxt soit prêt
		await nextTick()

		try {
			// Initialiser l'authentification
			const { initializeAuth } = useAuth()
			const { logError, logInfo } = useErrorLogger()

			logInfo('Starting authentication initialization')

			// Timeout uniquement en développement pour éviter les blocages locaux
			if (process.dev) {
				const timeoutPromise = new Promise((_, reject) => {
					setTimeout(
						() => reject(new Error('Development timeout - continuing without auth')),
						3000,
					)
				})

				await Promise.race([initializeAuth(), timeoutPromise])
			} else {
				await initializeAuth()
			}

			logInfo('Authentication initialized successfully')
		} catch (error) {
			const { logError } = useErrorLogger()
			logError(error, 'auth-init-plugin')

			if (process.dev) {
				console.warn('⚠️ Erreur dev - continuant sans auth:', error)
			} else {
				console.error("❌ Erreur lors de l'initialisation de l'authentification:", error)
			}
		}
	}
})
