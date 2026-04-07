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

/**
 * Checks whether a domain is in the allowlist
 */
function isDomainAllowed(hostname: string): boolean {
	const domain = hostname.toLowerCase().replace(/^www\./, '')
	return ALLOWED_DOMAINS.some(
		(allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
	)
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
		// Validation the URL
		const urlObj = new URL(url)

		// Restrict to HTTP/HTTPS protocols for safety
		if (!['http:', 'https:'].includes(urlObj.protocol)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Only HTTP and HTTPS URLs are allowed',
			})
		}

	// Check that the domain is in the allowlist for SSRF protection
		if (!isDomainAllowed(urlObj.hostname)) {
			throw createError({
				statusCode: 403,
				statusMessage: 'Domain not allowed',
			})
		}

		// Fetch the page with a timeout and appropriate headers
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 secondes timeout

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; ComebackBot/1.0)',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
			},
			signal: controller.signal,
		})

		clearTimeout(timeoutId)

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`)
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
