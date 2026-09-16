export default defineNuxtPlugin(() => {
	if (import.meta.server) {
		const { error: logError } = useLogger('error-handler')

		// Capture Vue errors server-side
		const app = useNuxtApp()
		app.hook('vue:error', (error, context) => {
			logError(error, `ssr-vue-error-${String(context)}`)
		})

		// Capture fatal Nuxt application errors during SSR.
		app.hook('app:error', (error) => {
			logError(error, 'ssr-app-error')
		})
	}
})
