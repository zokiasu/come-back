/**
 * Composable to manage platform and social links
 */

export interface LinkItem {
	name: string
	link: string
}

// Mapping the domaines vers the noms of platforms
export const PLATFORM_DOMAIN_MAPPINGS: Record<string, string> = {
	// platforms of streaming
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
	// Social networks
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

// Services of favicon with fallback
export const FAVICON_SERVICES = [
	(domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
	(domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
	(domain: string) => `https://${domain}/favicon.ico`,
]

export const useLinkManager = () => {
	/**
	 * Extracts a URL domain
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
	 * Checks whether a URL is valid
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
	 * Gets the platform name from a URL
	 */
	const getNameFromUrl = async (url: string): Promise<string> => {
		const domain = extractDomain(url)
		if (!domain) return ''

		// Use the mapping when the domain is known
		if (PLATFORM_DOMAIN_MAPPINGS[domain]) {
			return PLATFORM_DOMAIN_MAPPINGS[domain]
		}

		// For unknown domains, try to fetch the page title
		try {
			const response = await fetch(`/api/get-page-title?url=${encodeURIComponent(url)}`)
			if (response.ok) {
				const data = await response.json()
				if (data.title && data.title.trim()) {
					return data.title.trim()
				}
			}
		} catch (error) {
			console.warn('Impossible de récupérer le titre de la page:', error)
		}

		// Fallback: capitalize the domain name
		const domainPart = domain.split('.')[0]
		if (domainPart) {
			return domainPart.charAt(0).toUpperCase() + domainPart.slice(1)
		}
		return ''
	}

	/**
	 * Gets the favicon URL for a link
	 */
	const getFaviconUrl = (url: string, attempt: number = 0): string => {
		const domain = extractDomain(url)
		const faviconService = FAVICON_SERVICES[attempt]
		if (!domain || attempt >= FAVICON_SERVICES.length || !faviconService) {
			return '/default.png'
		}
		return faviconService(domain)
	}

	/**
	 * Filters valid links with a non-empty name and URL
	 */
	const filterValidLinks = <T extends LinkItem>(links: T[]): T[] => {
		return links.filter((link) => link.name?.trim() && link.link?.trim())
	}

	/**
	 * Creates a reactive link list manager
	 */
	const createLinkListManager = (initialLinks: LinkItem[] = []) => {
		const links = ref<LinkItem[]>(initialLinks)
		const loadingStates = ref<Record<number, boolean>>({})

		const add = () => {
			links.value.push({ name: '', link: '' })
		}

		const remove = (index: number) => {
			links.value.splice(index, 1)
			// Clear loading state by recreating the object without the key
			const { [index]: removed, ...rest } = loadingStates.value
			void removed
			loadingStates.value = rest
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

			// Do not auto-fill when the name is already set or the URL is empty
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
		createLinkListManager,
		// Constantes
		PLATFORM_DOMAIN_MAPPINGS,
		FAVICON_SERVICES,
	}
}
