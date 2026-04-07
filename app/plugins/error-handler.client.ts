export default defineNuxtPlugin(() => {
	if (import.meta.client) {
		const { logError } = useErrorLogger()

		// Capture global JavaScript errors
		window.addEventListener('error', (event) => {
			logError(event.error || event, 'global-error')
		})

		// Capture unhandled promise rejections
		window.addEventListener('unhandledrejection', (event) => {
			logError(event.reason, 'unhandled-rejection')
		})

		// Capture Vue errors
		const app = useNuxtApp()
		app.hook('vue:error', (error, context) => {
			// Serialize context safely
			let contextStr = 'unknown'
			try {
				contextStr = typeof context === 'string' ? context : JSON.stringify(context)
			} catch (_e) {
				contextStr = typeof context === 'object' ? 'object' : String(context)
			}
			logError(error, `vue-error-${contextStr}`)
		})
	}
})
