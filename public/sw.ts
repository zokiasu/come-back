import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

interface PushPayload {
	title: string
	body: string
	icon?: string
	image?: string
	url?: string
	tag?: string
}

// Precache static assets (manifest injected by Vite PWA plugin at build time)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Runtime caching — Google user content images
registerRoute(
	({ url }) => /^https:\/\/lh3\.googleusercontent\.com\/.*/i.test(url.href),
	new CacheFirst({
		cacheName: 'google-images',
		plugins: [
			new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }),
			new CacheableResponsePlugin({ statuses: [0, 200] }),
		],
	}),
)

// Runtime caching — ibb.co images
registerRoute(
	({ url }) => /^https:\/\/i\.ibb\.co\/.*/i.test(url.href),
	new CacheFirst({
		cacheName: 'ibb-images',
		plugins: [
			new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }),
			new CacheableResponsePlugin({ statuses: [0, 200] }),
		],
	}),
)

// Push notification handler
self.addEventListener('push', (event) => {
	if (!event.data) return

	const payload = event.data.json() as PushPayload

	event.waitUntil(
		self.registration.showNotification(payload.title, {
			body: payload.body,
			icon: payload.icon ?? '/icons/icon-192x192.png',
			badge: '/icons/icon-192x192.png',
			image: payload.image ?? undefined,
			data: { url: payload.url ?? '/' },
			tag: payload.tag ?? 'comeback',
		}),
	)
})

// Notification click handler — focus existing tab or open new one
self.addEventListener('notificationclick', (event) => {
	event.notification.close()

	const url: string = (event.notification.data as { url?: string })?.url ?? '/'

	event.waitUntil(
		self.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then((clients) => {
				const targetPath = new URL(url, self.location.origin).pathname
				const existing = clients.find((c) => c.url.includes(targetPath))
				if (existing) return existing.focus()
				return self.clients.openWindow(url)
			}),
	)
})
