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
			const supabase = useSupabaseClient()
			// Initialiser l'authentification
			const { initializeAuth } = useAuth()
			const { logInfo } = useErrorLogger()

			logInfo('Starting authentication initialization')

			// Initialisation complète pour éviter les états transitoires (connecté/déconnecté)
			await initializeAuth()

			// Écouter les changements d'auth (popup OAuth ou autres onglets)
			supabase.auth.onAuthStateChange(async (event) => {
				logInfo(`Auth state changed: ${event}`)
				const { ensureUserProfile } = useAuth()
				const userStore = useUserStore()

				if (
					event === 'INITIAL_SESSION' ||
					event === 'SIGNED_IN' ||
					event === 'TOKEN_REFRESHED' ||
					event === 'USER_UPDATED'
				) {
					await ensureUserProfile()
				}

				if (event === 'SIGNED_OUT') {
					await new Promise((resolve) => setTimeout(resolve, 300))
					const { data: userData } = await supabase.auth.getUser()
					if (userData.user?.id) {
						await ensureUserProfile()
						return
					}

					await userStore.resetStore()
				}
			})

			logInfo('Authentication initialized successfully')
		} catch (error) {
			const { logError } = useErrorLogger()
			logError(error, 'auth-init-plugin')

			if (import.meta.dev) {
				console.warn('⚠️ Erreur dev - continuant sans auth:', error)
			} else {
				console.error("❌ Erreur lors de l'initialisation de l'authentification:", error)
			}
		}
	}
})
