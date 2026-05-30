// Allow only trusted domains to prevent SSRF attacks
const ALLOWED_DOMAINS = [
	// platforms musicales
	'youtube.com',
	'youtu.be',
	'spotify.com',
	'open.spotify.com',
	'music.apple.com',
	'itunes.apple.com',
	'deezer.com',
	'soundcloud.com',
	'tidal.com',
	'music.amazon.com',
	'amazon.com',
	'bandcamp.com',
	'audiomack.com',
	'napster.com',
	'pandora.com',
	'qobuz.com',
	// Korean platforms
	'melon.com',
	'genie.co.kr',
	'bugs.co.kr',
	'vibe.naver.com',
	'flo.com',
	// Social networks
	'instagram.com',
	'twitter.com',
	'x.com',
	'facebook.com',
	'tiktok.com',
	'weibo.com',
	'weverse.io',
	// Autres platforms
	'vlive.tv',
	'bilibili.com',
]

// Cap on redirect hops we will follow while re-validating each one.
const MAX_REDIRECTS = 5

/**
 * Checks whether a domain is in the allowlist
 */
function isDomainAllowed(hostname: string): boolean {
	const domain = hostname.toLowerCase().replace(/^www\./, '')
	return ALLOWED_DOMAINS.some(
		(allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
	)
}

/**
 * Validates a target URL before we fetch it: HTTP/HTTPS only and host in the
 * allowlist. Called for the initial URL AND every redirect hop so a 30x from an
 * allowed host can't bounce the server onto an internal/private target (SSRF).
 */
function assertUrlAllowed(target: URL): void {
	if (!['http:', 'https:'].includes(target.protocol)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Only HTTP and HTTPS URLs are allowed',
		})
	}
	if (!isDomainAllowed(target.hostname)) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Domain not allowed',
		})
	}
}

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const url = query.url as string

	if (!url) {
		throw createError({
			statusCode: 400,
			statusMessage: 'URL parameter is required',
		})
	}

	try {
		// Validate the initial URL (throws on protocol/allowlist violation).
		assertUrlAllowed(new URL(url))

		// Follow redirects manually so every hop is re-validated against the
		// allowlist. fetch() follows redirects on its own and only the first URL
		// was checked, so a 30x from an allowed host could otherwise reach an
		// internal/private target (SSRF). 10s budget for the whole chain.
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 10000)

		let currentUrl = new URL(url)
		let response: Awaited<ReturnType<typeof fetch>> | undefined
		let redirects = 0

		try {
			for (;;) {
				assertUrlAllowed(currentUrl)

				response = await fetch(currentUrl, {
					method: 'GET',
					redirect: 'manual',
					headers: {
						'User-Agent': 'Mozilla/5.0 (compatible; ComebackBot/1.0)',
						Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
						'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
					},
					signal: controller.signal,
				})

				// Not a redirect → this is the final response.
				if (response.status < 300 || response.status >= 400) break

				const location = response.headers.get('location')
				if (!location) break // malformed redirect; handled by the checks below

				if (++redirects > MAX_REDIRECTS) {
					throw createError({ statusCode: 502, statusMessage: 'Too many redirects' })
				}

				// Resolve a relative Location against the current URL; the next
				// loop iteration re-validates it before any fetch.
				currentUrl = new URL(location, currentUrl)
			}
		} finally {
			clearTimeout(timeoutId)
		}

		if (!response || !response.ok) {
			throw new Error(`HTTP ${response?.status ?? 'no response'}`)
		}

		// Check the content-type
		const contentType = response.headers.get('content-type')
		if (!contentType || !contentType.includes('text/html')) {
			throw new Error('Content is not HTML')
		}

		const html = await response.text()

		// Extraire the title the page with a regex simple
		const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is)

		if (!titleMatch || !titleMatch[1]) {
			// Try to find fallback metadata
			const ogTitleMatch = html.match(
				/<meta[^>]*property=['"](og:title|twitter:title)['"][^>]*content=['"]([^'"]*)['"]/i,
			)
			if (ogTitleMatch && ogTitleMatch[2]) {
				return {
					title: decodeHtmlEntities(ogTitleMatch[2]).substring(0, 100), // Limit to 100 characters
					source: 'og:title',
				}
			}

			throw new Error('No title found')
		}

		// Clean and decode the title
		const title = decodeHtmlEntities(titleMatch[1].trim()).substring(0, 100) // Limit to 100 characters

		return {
			title,
			source: 'title',
		}
	} catch (error) {
		console.error('Error fetching page title:', error)

		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to fetch page title',
		})
	}
})

// Helper to decode basic HTML entities
function decodeHtmlEntities(text: string): string {
	const entities: Record<string, string> = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'",
		'&apos;': "'",
		'&nbsp;': ' ',
	}

	return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
		return entities[entity] || entity
	})
}
