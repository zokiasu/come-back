import { useDebounce } from '~/composables/useDebounce'

export type YtmIdStatus = 'idle' | 'checking' | 'available' | 'exists' | 'blacklisted' | 'error'

interface CheckYtmIdResponse {
	status: 'available' | 'exists' | 'blacklisted'
	reason?: string | null
	artistName?: string | null
}

const MIN_YTM_ID_LENGTH = 6

export function useYoutubeMusicIdCheck() {
	const { getAuthHeaders } = useApiAuthHeaders()
	const status = ref<YtmIdStatus>('idle')
	const message = ref<string | null>(null)

	const isBlocked = computed(() => status.value === 'exists' || status.value === 'blacklisted')

	const reset = () => {
		status.value = 'idle'
		message.value = null
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
			const headers = getAuthHeaders()
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
