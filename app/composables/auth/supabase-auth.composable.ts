import { useUserStore } from '@/stores/user'
import type { Database } from '~/types'

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
				},
			})

			if (authError) {
				console.error('❌ Erreur OAuth:', authError)
				throw authError
			}

		} catch (err: any) {
			console.error('❌ Erreur lors de la connexion Google:', err)
			error.value = err.message || 'Erreur de connexion'
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
			} else {
			}
		} catch (err: any) {
			console.error('❌ Erreur lors du callback:', err)
			error.value = err.message || 'Erreur de callback'
		}
	}

	const logout = async () => {
		const { logout: authLogout } = useAuth()
		try {
			await authLogout()
		} catch (err: any) {
			console.error('Erreur lors de la déconnexion:', err)
			error.value = err.message || 'Erreur de déconnexion'
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
