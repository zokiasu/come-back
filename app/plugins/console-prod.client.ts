export default defineNuxtPlugin(() => {
	// Disable the console.log in production only client-side
	if (import.meta.client && import.meta.env.PROD) {
		// eslint-disable-next-line no-console
		console.log = () => {}
		// eslint-disable-next-line no-console
		console.info = () => {}
		// eslint-disable-next-line no-console
		console.debug = () => {}
		// Keep console.warn and console.error for real issues

		console.warn('🚀 Mode production: console.log désactivés')
	}
})
