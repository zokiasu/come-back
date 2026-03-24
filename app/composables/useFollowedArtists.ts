import type { FollowedArtist } from '~/types'

export function useFollowedArtists() {
	const { requireAuthHeaders } = useApiAuthHeaders()
	const { runMutation } = useMutationTimeout()

	const followedArtists = ref<FollowedArtist[]>([])
	const isLoading = ref(false)
	const followedIds = computed(() => new Set(followedArtists.value.map((a) => a.id)))

	const fetchFollowedArtists = async () => {
		isLoading.value = true
		try {
			followedArtists.value = await $fetch<FollowedArtist[]>('/api/artists/followed', {
				headers: requireAuthHeaders(),
			})
		} finally {
			isLoading.value = false
		}
	}

	const followArtist = async (artistId: string) => {
		await runMutation(
			$fetch(`/api/artists/${artistId}/follow`, {
				method: 'POST',
				headers: requireAuthHeaders(),
			}),
			"Le suivi de l'artiste a expiré.",
		)
		await fetchFollowedArtists()
	}

	const unfollowArtist = async (artistId: string) => {
		await runMutation(
			$fetch(`/api/artists/${artistId}/follow`, {
				method: 'DELETE',
				headers: requireAuthHeaders(),
			}),
			"Le désuivi de l'artiste a expiré.",
		)
		await fetchFollowedArtists()
	}

	const isFollowing = (artistId: string) => followedIds.value.has(artistId)

	return {
		followedArtists,
		isLoading,
		followedIds,
		fetchFollowedArtists,
		followArtist,
		unfollowArtist,
		isFollowing,
	}
}
