export default defineNuxtPlugin(async () => {
	// client-side authentication initialization plugin
	if (import.meta.client) {
		// Do not initialize on the callback page to avoid conflicts
		const route = useRoute()
		if (route.path === '/auth/callback') {
			return
		}

		// Wait until Nuxt is ready
		await nextTick()

		try {
			const supabase = useSupabaseClient()
			// Initialize authentication
			const { initializeAuth } = useAuth()
			const { logInfo } = useErrorLogger()

			logInfo('Starting authentication initialization')

			// Fully initialize auth to avoid transient signed-in or signed-out states
			await initializeAuth()

			// Listen for auth changes from the OAuth popup or other tabs
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
