export default defineNuxtRouteMiddleware(async (to, from) => {
	// Côté client, attendre l'initialisation de l'auth
	if (import.meta.client) {
		const { ensureAuthInitialized } = useAuth()

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
	}

	const user = useSupabaseUser()

	if (!user.value) {
		return navigateTo('/authentification')
	}
})
