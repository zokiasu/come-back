// Ce plugin s'assure que le store utilisateur est hydraté après la restauration Pinia
// pinia-plugin-persistedstate/nuxt gère automatiquement la restauration via afterHydrate
export default defineNuxtPlugin(() => {
	if (import.meta.client) {
		const userStore = useUserStore()

		// Si le store n'est pas encore hydraté (pas de données dans localStorage),
		// marquer comme hydraté maintenant
		if (!userStore.isHydrated) {
			userStore.isHydrated = true
		}
	}
})
