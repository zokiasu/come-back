export function useApiAuthHeaders() {
	const createAuthHeaders = (accessToken: string) => ({
		Authorization: `Bearer ${accessToken}`,
	})

	const getAccessToken = () => {
		if (!import.meta.client) return null

		return useSupabaseSession().value?.access_token ?? null
	}

	const getAuthHeaders = () => {
		const accessToken = getAccessToken()

		if (!accessToken) return undefined

		return createAuthHeaders(accessToken)
	}

	const getAuthHeadersFromSession = async () => {
		const headers = getAuthHeaders()
		if (headers) return headers
		if (!import.meta.client) return undefined

		const { data } = await useSupabaseClient().auth.getSession()
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
		getAuthHeaders,
		getAuthHeadersFromSession,
		requireAuthHeaders,
		requireAuthHeadersFromSession,
	}
}
