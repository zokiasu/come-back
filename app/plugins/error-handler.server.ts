export default defineNuxtPlugin(() => {
	if (import.meta.server) {
		const { logError } = useErrorLogger()

		// Capturer les erreurs Vue côté serveur
		const app = useNuxtApp()
		app.hook('vue:error', (error, context) => {
			logError(error, `ssr-vue-error-${String(context)}`)
		})

		// Capturer les erreurs de rendu
		// @ts-expect-error - render:error hook exists but not in types
		app.hook('render:error', (error, context) => {
			logError(error, `ssr-render-error-${String(context)}`)
		})
	}
})
