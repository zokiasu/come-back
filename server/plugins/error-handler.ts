// Fix for Nuxt 4 "html.replace is not a function" error in dev mode
// This occurs when the error overlay receives an object instead of a string
export default defineNitroPlugin((nitroApp) => {
	nitroApp.hooks.hook('error', async (error) => {
		// Log the actual error for debugging
		console.error('[Server Error]', error)
	})
})
