import type {
	UserRanking,
	UserRankingItem,
	UserRankingWithItems,
	UserRankingWithPreview,
} from '~/types'
import type { RankingListResponse, SuccessResponse } from '~/types/api'

type RankingUpdates = Partial<Pick<UserRanking, 'name' | 'description' | 'is_public'>>

const getErrorStatus = (error: unknown): number | undefined => {
	if (typeof error !== 'object' || error === null) return undefined
	if ('statusCode' in error && typeof error.statusCode === 'number')
		return error.statusCode
	if ('status' in error && typeof error.status === 'number') return error.status
	return undefined
}

export function useSupabaseRanking() {
	const userStore = useUserStore()
	const toast = useToast()
	const { runMutation } = useMutationTimeout()
	const { requireAuthHeadersFromSession } = useApiAuthHeaders()

	const showError = (description: string) => {
		toast.add({ title: 'Error', description, color: 'error' })
	}

	const getUserRankings = async (): Promise<UserRankingWithPreview[]> => {
		if (!userStore.userDataStore?.id) return []

		try {
			return await $fetch<UserRankingWithPreview[]>('/api/rankings', {
				headers: await requireAuthHeadersFromSession(),
			})
		} catch (error) {
			console.error('Error while fetching rankings:', error)
			showError('Unable to load your rankings')
			return []
		}
	}

	const getRankingsByUserId = async (
		userId: string,
		options?: { publicOnly?: boolean },
	): Promise<UserRankingWithPreview[]> => {
		if (!userId) return []
		if (!options?.publicOnly && userId === userStore.userDataStore?.id) {
			return getUserRankings()
		}

		try {
			const response = await $fetch<RankingListResponse>('/api/rankings/public', {
				query: { userId, page: 1, limit: 50 },
			})
			return response.rankings
		} catch (error) {
			console.error('Error while fetching rankings by user:', error)
			showError('Unable to load rankings for this profile')
			return []
		}
	}

	const getRankingById = async (id: string): Promise<UserRankingWithItems | null> => {
		try {
			return await $fetch<UserRankingWithItems>(`/api/rankings/${id}`, {
				headers: await requireAuthHeadersFromSession(),
			})
		} catch (error) {
			console.error('Error while fetching ranking:', error)
			return null
		}
	}

	const createRanking = async (
		name: string,
		description?: string,
	): Promise<UserRanking | null> => {
		if (!userStore.userDataStore?.id) {
			showError('You must be signed in')
			return null
		}

		try {
			const data = await runMutation(
				$fetch<UserRanking>('/api/rankings', {
					method: 'POST',
					headers: await requireAuthHeadersFromSession(),
					body: { name, description: description || null },
				}),
				'Creating the ranking timed out. Please try again.',
			)

			toast.add({
				title: 'Success',
				description: 'Ranking created successfully',
				color: 'success',
			})
			return data
		} catch (error) {
			console.error('Error while creating ranking:', error)
			showError('Unable to create ranking')
			return null
		}
	}

	const updateRanking = async (
		id: string,
		updates: RankingUpdates,
	): Promise<UserRanking | null> => {
		try {
			return await runMutation(
				$fetch<UserRanking>(`/api/rankings/${id}`, {
					method: 'PATCH',
					headers: await requireAuthHeadersFromSession(),
					body: updates,
				}),
				'Updating the ranking timed out. Please try again.',
			)
		} catch (error) {
			console.error('Error while updating ranking:', error)
			showError('Unable to update ranking')
			return null
		}
	}

	const deleteRanking = async (id: string): Promise<boolean> => {
		try {
			await runMutation(
				$fetch<SuccessResponse>(`/api/rankings/${id}`, {
					method: 'DELETE',
					headers: await requireAuthHeadersFromSession(),
				}),
				'Deleting the ranking timed out. Please try again.',
			)

			toast.add({ title: 'Success', description: 'Ranking deleted', color: 'success' })
			return true
		} catch (error) {
			console.error('Error while deleting ranking:', error)
			showError('Unable to delete ranking')
			return false
		}
	}

	const addMusicToRanking = async (
		rankingId: string,
		musicId: string,
	): Promise<UserRankingItem | null> => {
		try {
			return await runMutation(
				$fetch<UserRankingItem>(`/api/rankings/${rankingId}/items`, {
					method: 'POST',
					headers: await requireAuthHeadersFromSession(),
					body: { music_id: musicId },
				}),
				'Adding the track to the ranking timed out. Please try again.',
			)
		} catch (error) {
			if (getErrorStatus(error) === 409) {
				toast.add({
					title: 'Already added',
					description: 'This track is already in the ranking',
					color: 'warning',
				})
			} else if (getErrorStatus(error) === 400) {
				toast.add({
					title: 'Limit reached',
					description: 'A ranking cannot contain more than 100 tracks',
					color: 'warning',
				})
			} else {
				console.error('Error while adding track:', error)
				showError('Unable to add the track')
			}
			return null
		}
	}

	const removeMusicFromRanking = async (
		rankingId: string,
		musicId: string,
	): Promise<boolean> => {
		try {
			await runMutation(
				$fetch<SuccessResponse>(`/api/rankings/${rankingId}/items/${musicId}`, {
					method: 'DELETE',
					headers: await requireAuthHeadersFromSession(),
				}),
				'Removing the track from the ranking timed out. Please try again.',
			)
			return true
		} catch (error) {
			console.error('Error while removing track:', error)
			showError('Unable to remove the track')
			return false
		}
	}

	const reorderRankingItems = async (
		rankingId: string,
		items: { id: string; position: number }[],
	): Promise<boolean> => {
		try {
			await runMutation(
				$fetch<SuccessResponse>(`/api/rankings/${rankingId}/items/reorder`, {
					method: 'PUT',
					headers: await requireAuthHeadersFromSession(),
					body: { items },
				}),
				'Reordering the ranking timed out. Please try again.',
			)
			return true
		} catch (error) {
			console.error('Error while reordering:', error)
			showError('Unable to reorder tracks')
			return false
		}
	}

	const getPublicRankingById = async (
		id: string,
	): Promise<UserRankingWithItems | null> => {
		try {
			return await $fetch<UserRankingWithItems>(`/api/rankings/${id}`)
		} catch (error) {
			console.error('Error while fetching public ranking:', error)
			return null
		}
	}

	const getPublicRankings = async (
		page: number = 1,
		limit: number = 20,
	): Promise<RankingListResponse> => {
		try {
			return await $fetch<RankingListResponse>('/api/rankings/public', {
				query: { page, limit },
			})
		} catch (error) {
			console.error('Error while fetching public rankings:', error)
			return { rankings: [], total: 0 }
		}
	}

	return {
		getUserRankings,
		getRankingsByUserId,
		getRankingById,
		getPublicRankingById,
		createRanking,
		updateRanking,
		deleteRanking,
		addMusicToRanking,
		removeMusicFromRanking,
		reorderRankingItems,
		getPublicRankings,
	}
}
