import { useDebounce } from '~/composables/useDebounce'

export type YtmIdStatus = 'idle' | 'checking' | 'available' | 'exists' | 'blacklisted' | 'error'

interface CheckYtmIdResponse {
	status: 'available' | 'exists' | 'blacklisted'
	reason?: string | null
	artistName?: string | null
}

const MIN_YTM_ID_LENGTH = 6

export function useYoutubeMusicIdCheck() {
	const config = useRuntimeConfig()
	const supabase = useSupabaseClient()
	const status = ref<YtmIdStatus>('idle')
	const message = ref<string | null>(null)

	const isBlocked = computed(() => status.value === 'exists' || status.value === 'blacklisted')

	const reset = () => {
		status.value = 'idle'
		message.value = null
	}

	const getAuthHeaders = async () => {
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession()

			if (session?.access_token) {
				return {
					Authorization: `Bearer ${session.access_token}`,
				}
			}
		} catch {
			// Fall back to cookie parsing below when session access is unavailable.
		}

		if (!import.meta.client) return undefined

		const supabaseUrl = config.public.supabase?.url
		if (!supabaseUrl) return undefined

		const projectRef = new URL(supabaseUrl).host.split('.')[0]
		if (!projectRef) return undefined

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

		if (!matchingCookies.length) return undefined

		const rawValue = matchingCookies.map((entry) => entry.value).join('')
		const decodedValue = decodeURIComponent(rawValue)

		if (!decodedValue.startsWith('base64-')) return undefined

		try {
			const parsed = JSON.parse(atob(decodedValue.slice(7)))
			if (typeof parsed?.access_token === 'string') {
				return {
					Authorization: `Bearer ${parsed.access_token}`,
				}
			}
		} catch {
			return undefined
		}

		return undefined
	}

	const checkId = async (idYoutubeMusic: string) => {
		const trimmedId = idYoutubeMusic?.trim() || ''
		if (trimmedId.length < MIN_YTM_ID_LENGTH) {
			reset()
			return
		}

		status.value = 'checking'
		message.value = null

		try {
			const headers = await getAuthHeaders()
			const result = await $fetch<CheckYtmIdResponse>('/api/artists/check-youtube-id', {
				query: { id: trimmedId },
				headers,
			})

			if (result.status === 'blacklisted') {
				status.value = 'blacklisted'
				message.value = result.reason
					? `This YouTube Music ID is blacklisted: ${result.reason}`
					: 'This YouTube Music ID is blacklisted'
			} else if (result.status === 'exists') {
				status.value = 'exists'
				message.value = result.artistName
					? `This YouTube Music ID is already registered (${result.artistName})`
					: 'This YouTube Music ID is already registered'
			} else {
				status.value = 'available'
				message.value = null
			}
		} catch {
			status.value = 'error'
			message.value = 'Failed to validate YouTube Music ID'
		}
	}

	const debouncedCheck = useDebounce(checkId, 500)

	return {
		status: readonly(status),
		message: readonly(message),
		isBlocked: readonly(isBlocked),
		checkId: debouncedCheck,
		reset,
	}
}
