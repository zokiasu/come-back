// Workaround for Nuxt 4 "html.replace is not a function" error
// See: https://github.com/nuxt/nuxt/issues/33748
// This middleware blocks dev service worker paths that can cause the error handler to fail
export default defineEventHandler((event) => {
	const url = event.node.req.url || ''

	// Only apply in development
	if (process.dev) {
		const ignorePathList = ['/dev-sw.js', '/__vite', '/@vite', '/@id', '/__nuxt']

		if (ignorePathList.some((path) => url.startsWith(path))) {
			// Let Vite handle these paths, don't process further
			return
		}
	}
})
