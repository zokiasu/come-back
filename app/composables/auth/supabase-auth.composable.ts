export const useSupabaseAuth = () => {
	const isLoading = ref(false)
	const error = ref<string | null>(null)

	const loginWithGoogle = async () => {
		isLoading.value = true
		error.value = null

		try {
			// Utiliser le client Supabase global
			const supabase = useSupabaseClient()

			const { data, error: authError } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${useRequestURL().origin}/auth/callback`,
					scopes: 'openid email profile',
					queryParams: {
						access_type: 'offline',
						prompt: 'consent',
					},
					skipBrowserRedirect: true,
				},
			})

			if (authError) {
				console.error('❌ Erreur OAuth:', authError)
				throw authError
			}

			if (data?.url) {
				const popup = window.open(
					data.url,
					'comeback-auth',
					'width=480,height=640,noopener,noreferrer',
				)
				if (!popup) {
					window.location.href = data.url
				}
			} else {
				throw new Error('OAuth URL not provided')
			}
		} catch (err: unknown) {
			console.error('❌ Erreur lors de la connexion Google:', err)
			error.value = err instanceof Error ? err.message : 'Erreur de connexion'
		} finally {
			isLoading.value = false
		}
	}

	const handleAuthCallback = async () => {
		try {
			const user = useSupabaseUser()
			const { ensureUserProfile } = useAuth()

			if (user.value) {
				// Synchroniser le profil utilisateur
				await ensureUserProfile()

				await navigateTo('/')
			}
		} catch (err: unknown) {
			console.error('❌ Erreur lors du callback:', err)
			error.value = err instanceof Error ? err.message : 'Erreur de callback'
		}
	}

	const logout = async () => {
		const { logout: authLogout } = useAuth()
		try {
			await authLogout()
		} catch (err: unknown) {
			console.error('Erreur lors de la déconnexion:', err)
			error.value = err instanceof Error ? err.message : 'Erreur de déconnexion'
		}
	}

	return {
		isLoading,
		error,
		loginWithGoogle,
		logout,
		handleAuthCallback,
	}
}
