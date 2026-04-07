// Ensure the user store is hydrated after Pinia state restoration
// pinia-plugin-persistedstate/nuxt restores state automatically via afterHydrate
export default defineNuxtPlugin(() => {
	if (import.meta.client) {
		const userStore = useUserStore()

		// If the store is still not hydrated (no data in localStorage),
		// mark it as hydrated now
		if (!userStore.isHydrated) {
			userStore.isHydrated = true
		}
	}
})
