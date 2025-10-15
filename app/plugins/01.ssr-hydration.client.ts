export default defineNuxtPlugin(() => {
	// Initialiser le store utilisateur côté client
	const userStore = useUserStore()

	// Marquer le store comme hydraté
	userStore.initializeStore()

	// Gérer les erreurs d'hydratation
	if (import.meta.client) {
		// Attendre que Vue soit hydraté avant d'initialiser les composants sensibles
		nextTick(() => {
			// Le store est maintenant prêt pour l'hydratation
			userStore.isHydrated = true
		})
	}
})
