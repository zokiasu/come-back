import { AUTH_INIT_TIMEOUT_MS } from '~/constants/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
	const user = useSupabaseUser()

	// SSR: Vérification simple côté serveur
	if (import.meta.server) {
		if (!user.value) {
			return navigateTo('/authentification')
		}
		return
	}

	// Client: Attendre l'initialisation si nécessaire
	if (import.meta.client) {
		const { ensureAuthInitialized } = useAuth()

		// Tentative rapide d'initialisation avec timeout configuré
		try {
			await Promise.race([
				ensureAuthInitialized(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Auth timeout')), AUTH_INIT_TIMEOUT_MS),
				),
			])
		} catch (error) {
			// En cas de timeout, vérifier quand même si user existe
			if (!user.value) {
				return navigateTo('/authentification')
			}
		}
	}

	// Vérification finale
	if (!user.value) {
		return navigateTo('/authentification')
	}
})
