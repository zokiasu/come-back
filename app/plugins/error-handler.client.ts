export default defineNuxtPlugin(() => {
	if (import.meta.client) {
		const { logError } = useErrorLogger()

		// Capturer les erreurs JavaScript globales
		window.addEventListener('error', (event) => {
			logError(event.error || event, 'global-error')
		})

		// Capturer les rejets de promesses non gérées
		window.addEventListener('unhandledrejection', (event) => {
			logError(event.reason, 'unhandled-rejection')
		})

		// Capturer les erreurs Vue
		const app = useNuxtApp()
		app.hook('vue:error', (error, context) => {
			// Sérialiser le contexte de manière sûre
			let contextStr = 'unknown'
			try {
				contextStr = typeof context === 'string' ? context : JSON.stringify(context)
			} catch (e) {
				contextStr = typeof context === 'object' ? 'object' : String(context)
			}
			logError(error, `vue-error-${contextStr}`)
		})
	}
})
