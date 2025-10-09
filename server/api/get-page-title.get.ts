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
		// Validation de l'URL
		const urlObj = new URL(url)

		// Limiter aux protocoles HTTP/HTTPS pour la sécurité
		if (!['http:', 'https:'].includes(urlObj.protocol)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Only HTTP and HTTPS URLs are allowed',
			})
		}

		// Fetch de la page avec un timeout et des headers appropriés
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

		// Vérifier le content-type
		const contentType = response.headers.get('content-type')
		if (!contentType || !contentType.includes('text/html')) {
			throw new Error('Content is not HTML')
		}

		const html = await response.text()

		// Extraire le titre de la page avec une regex simple
		const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is)

		if (!titleMatch || !titleMatch[1]) {
			// Essayer de trouver des métadonnées alternatives
			const ogTitleMatch = html.match(
				/<meta[^>]*property=['"](og:title|twitter:title)['"][^>]*content=['"]([^'"]*)['"]/i,
			)
			if (ogTitleMatch && ogTitleMatch[2]) {
				return {
					title: decodeHtmlEntities(ogTitleMatch[2]).substring(0, 100), // Limiter à 100 caractères
					source: 'og:title',
				}
			}

			throw new Error('No title found')
		}

		// Nettoyer et décoder le titre
		const title = decodeHtmlEntities(titleMatch[1].trim()).substring(0, 100) // Limiter à 100 caractères

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

// Fonction utilitaire pour décoder les entités HTML basiques
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
