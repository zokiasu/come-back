/**
 * Composable pour gérer les liens platform et social
 */

export interface LinkItem {
	name: string
	link: string
}

// Mapping des domaines vers les noms de plateformes
export const PLATFORM_DOMAIN_MAPPINGS: Record<string, string> = {
	// Plateformes de streaming
	'youtube.com': 'YouTube',
	'music.youtube.com': 'YouTube Music',
	'open.spotify.com': 'Spotify',
	'spotify.com': 'Spotify',
	'soundcloud.com': 'SoundCloud',
	'apple.com': 'Apple Music',
	'music.apple.com': 'Apple Music',
	'tidal.com': 'Tidal',
	'deezer.com': 'Deezer',
	'amazon.com': 'Amazon Music',
	'music.amazon.com': 'Amazon Music',
	'bandcamp.com': 'Bandcamp',
	// Réseaux sociaux
	'instagram.com': 'Instagram',
	'facebook.com': 'Facebook',
	'twitter.com': 'Twitter',
	'x.com': 'X (Twitter)',
	'tiktok.com': 'TikTok',
	'linkedin.com': 'LinkedIn',
	'twitch.tv': 'Twitch',
	'discord.gg': 'Discord',
	'discord.com': 'Discord',
	'threads.net': 'Threads',
	'weibo.com': 'Weibo',
	'weverse.io': 'Weverse',
	'vlive.tv': 'V LIVE',
	'cafe.daum.net': 'Daum Cafe',
}

// Services de favicon avec fallback
export const FAVICON_SERVICES = [
	(domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
	(domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
	(domain: string) => `https://${domain}/favicon.ico`,
]

export const useLinkManager = () => {
	/**
	 * Extrait le domaine d'une URL
	 */
	const extractDomain = (url: string): string | null => {
		try {
			const urlObj = new URL(url)
			return urlObj.hostname.replace('www.', '')
		} catch {
			return null
		}
	}

	/**
	 * Vérifie si une URL est valide
	 */
	const isValidUrl = (url: string): boolean => {
		try {
			new URL(url)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Obtient le nom de la plateforme à partir d'une URL
	 */
	const getNameFromUrl = async (url: string): Promise<string> => {
		const domain = extractDomain(url)
		if (!domain) return ''

		// Si le domaine est connu, utiliser le mapping
		if (PLATFORM_DOMAIN_MAPPINGS[domain]) {
			return PLATFORM_DOMAIN_MAPPINGS[domain]
		}

		// Pour les domaines inconnus, essayer de récupérer le titre de la page
		try {
			const response = await fetch(`/api/get-page-title?url=${encodeURIComponent(url)}`)
			if (response.ok) {
				const data = await response.json()
				if (data.title && data.title.trim()) {
					return data.title.trim()
				}
			}
		} catch (error) {
			console.log('Impossible de récupérer le titre de la page:', error)
		}

		// Fallback: capitaliser le nom de domaine
		const domainPart = domain.split('.')[0]
		if (domainPart) {
			return domainPart.charAt(0).toUpperCase() + domainPart.slice(1)
		}
		return ''
	}

	/**
	 * Obtient l'URL du favicon pour un lien
	 */
	const getFaviconUrl = (url: string, attempt: number = 0): string => {
		const domain = extractDomain(url)
		if (!domain || attempt >= FAVICON_SERVICES.length) {
			return '/default.png'
		}
		return FAVICON_SERVICES[attempt](domain)
	}

	/**
	 * Filtre les liens valides (nom et lien non vides)
	 */
	const filterValidLinks = <T extends LinkItem>(links: T[]): T[] => {
		return links.filter((link) => link.name?.trim() && link.link?.trim())
	}

	/**
	 * Crée un gestionnaire de liste de liens réactif
	 */
	const createLinkListManager = (initialLinks: LinkItem[] = []) => {
		const links = ref<LinkItem[]>(initialLinks)
		const loadingStates = ref<Record<number, boolean>>({})

		const add = () => {
			links.value.push({ name: '', link: '' })
		}

		const remove = (index: number) => {
			links.value.splice(index, 1)
			// Nettoyer l'état de chargement
			delete loadingStates.value[index]
		}

		const updateName = (index: number, name: string) => {
			if (links.value[index]) {
				links.value[index].name = name
			}
		}

		const updateLink = (index: number, link: string) => {
			if (links.value[index]) {
				links.value[index].link = link
			}
		}

		const updateNameFromEvent = (index: number, event: Event) => {
			const name = (event.target as HTMLInputElement).value
			updateName(index, name)
		}

		const updateLinkFromEvent = (index: number, event: Event) => {
			const link = (event.target as HTMLInputElement).value
			updateLink(index, link)
		}

		const autoFillName = async (index: number, url: string) => {
			const currentItem = links.value[index]

			// Ne pas auto-compléter si le nom est déjà rempli ou l'URL est vide
			if (!url || currentItem?.name || !isValidUrl(url)) {
				return
			}

			loadingStates.value[index] = true
			try {
				const suggestedName = await getNameFromUrl(url)
				if (suggestedName) {
					updateName(index, suggestedName)
				}
			} finally {
				loadingStates.value[index] = false
			}
		}

		const getValidLinks = () => filterValidLinks(links.value)

		const reset = (newLinks: LinkItem[] = []) => {
			links.value = newLinks
			loadingStates.value = {}
		}

		return {
			links,
			loadingStates: readonly(loadingStates),
			add,
			remove,
			updateName,
			updateLink,
			updateNameFromEvent,
			updateLinkFromEvent,
			autoFillName,
			getValidLinks,
			reset,
		}
	}

	return {
		// Utilitaires
		extractDomain,
		isValidUrl,
		getNameFromUrl,
		getFaviconUrl,
		filterValidLinks,
		// Factory
		createLinkListManager,
		// Constantes
		PLATFORM_DOMAIN_MAPPINGS,
		FAVICON_SERVICES,
	}
}
