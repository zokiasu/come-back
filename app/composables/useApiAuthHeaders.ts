export function useApiAuthHeaders() {
	const config = useRuntimeConfig()
	const supabase = useSupabaseClient()

	const createAuthHeaders = (accessToken: string) => ({
		Authorization: `Bearer ${accessToken}`,
	})

	const getAccessTokenFromCookie = () => {
		if (!import.meta.client) return null

		const supabaseUrl = config.public.supabase?.url
		if (!supabaseUrl) return null

		const projectRef = new URL(supabaseUrl).host.split('.')[0]
		if (!projectRef) return null

		const cookiePrefix = `sb-${projectRef}-auth-token`
		const cookieEntries = document.cookie
			.split('; ')
			.map((entry) => {
				const separatorIndex = entry.indexOf('=')
				if (separatorIndex === -1) return null

				return {
					name: entry.slice(0, separatorIndex),
					value: entry.slice(separatorIndex + 1),
				}
			})
			.filter((entry): entry is { name: string; value: string } => Boolean(entry))

		const matchingCookies = cookieEntries
			.filter(
				(entry) =>
					entry.name === cookiePrefix || entry.name.startsWith(`${cookiePrefix}.`),
			)
			.sort((left, right) => left.name.localeCompare(right.name))

		if (!matchingCookies.length) return null

		const rawValue = matchingCookies.map((entry) => entry.value).join('')
		const decodedValue = decodeURIComponent(rawValue)

		if (!decodedValue.startsWith('base64-')) return null

		try {
			const parsed = JSON.parse(atob(decodedValue.slice(7)))
			return typeof parsed?.access_token === 'string' ? parsed.access_token : null
		} catch {
			return null
		}
	}

	const getAuthHeaders = () => {
		const accessToken = getAccessTokenFromCookie()

		if (!accessToken) return undefined

		return createAuthHeaders(accessToken)
	}

	const getAuthHeadersFromSession = async () => {
		const cookieHeaders = getAuthHeaders()
		if (cookieHeaders) return cookieHeaders
		if (!import.meta.client) return undefined

		const { data } = await supabase.auth.getSession()
		const accessToken = data.session?.access_token

		return accessToken ? createAuthHeaders(accessToken) : undefined
	}

	const requireAuthHeaders = () => {
		const headers = getAuthHeaders()

		if (!headers) {
			throw new Error('Missing access token')
		}

		return headers
	}

	const requireAuthHeadersFromSession = async () => {
		const headers = await getAuthHeadersFromSession()

		if (!headers) {
			throw new Error('Missing access token')
		}

		return headers
	}

	return {
		getAccessTokenFromCookie,
		getAuthHeaders,
		getAuthHeadersFromSession,
		requireAuthHeaders,
		requireAuthHeadersFromSession,
	}
}
