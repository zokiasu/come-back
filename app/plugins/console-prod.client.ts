export default defineNuxtPlugin(() => {
	// Désactiver les console.log en production uniquement côté client
	if (import.meta.client && import.meta.env.PROD) {
		// eslint-disable-next-line no-console
		console.log = () => {}
		// eslint-disable-next-line no-console
		console.info = () => {}
		// eslint-disable-next-line no-console
		console.debug = () => {}
		// Garder console.warn et console.error pour les vrais problèmes

		console.warn('🚀 Mode production: console.log désactivés')
	}
})
