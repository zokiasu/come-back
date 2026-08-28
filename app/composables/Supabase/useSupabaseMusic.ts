import type { MusicType, Music } from '~/types'
import type { TablesUpdate } from '~/types/supabase'

interface PaginatedMusicsResponse {
	musics: Music[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export function useSupabaseMusic() {
	const toast = useToast()
	const { requireAuthHeaders } = useApiAuthHeaders()
	const { runMutation } = useMutationTimeout()

	// Updates a music
	const updateMusic = async (
		id: string,
		updates: Partial<TablesUpdate<'musics'>>,
	) => {
		try {
			const data = await runMutation(
				$fetch<Music>(`/api/musics/${id}`, {
					method: 'PATCH',
					headers: requireAuthHeaders(),
					body: { updates },
				}),
				'Updating the track timed out. Please try again.',
			)
			return data
		} catch (error) {
			console.error('[useSupabaseMusic] updateMusic failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Erreur lors de la mise à jour de la musique',
				description: extractErrorMessage(error),
				color: 'error',
			})
			return null
		}
	}

	const updateMusicReleases = async (id: string, releaseIds?: string[]) => {
		try {
			await runMutation(
				$fetch(`/api/musics/${id}`, {
					method: 'PATCH',
					headers: requireAuthHeaders(),
					body: { releaseIds },
				}),
				'Linking releases to the track timed out. Please try again.',
			)
			return true
		} catch (error) {
			console.error('[useSupabaseMusic] updateMusicReleases failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Erreur lors de la mise à jour des releases',
				description: extractErrorMessage(error),
				color: 'error',
			})
			return false
		}
	}

	// Deletes a music
	const deleteMusic = async (id: string) => {
		try {
			await runMutation(
				$fetch(`/api/musics/${id}`, {
					method: 'DELETE',
					headers: requireAuthHeaders(),
				}),
				'Deleting the track timed out. Please try again.',
			)
			return true
		} catch (error) {
			console.error('[useSupabaseMusic] deleteMusic failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Erreur lors de la suppression de la musique',
				description: extractErrorMessage(error),
				color: 'error',
			})
			return false
		}
	}

	// Fetches musics by page with pagination and advanced filters
	const getMusicsByPage = async (
		page: number,
		limit: number,
		options?: {
			search?: string
			artistName?: string
			artistId?: string
			artistIds?: string[]
			year?: number
			years?: number[]
			styles?: string[]
			type?: MusicType
			verified?: boolean | null
			orderBy?: keyof Music
			orderDirection?: 'asc' | 'desc'
			ismv?: boolean
		},
	) => {
		try {
			// Build the query params
			const params: Record<string, string> = {
				page: page.toString(),
				limit: limit.toString(),
			}

			if (options?.search) {
				params.search = options.search
			}

			// Support for multi-years or year unique
			if (options?.years && options.years.length > 0) {
				params.years = options.years.join(',')
			} else if (options?.year !== undefined && options.year !== null) {
				params.years = options.year.toString()
			}

			if (options?.orderBy) {
				params.orderBy = options.orderBy
			}

			if (options?.orderDirection) {
				params.orderDirection = options.orderDirection
			}

			if (options?.ismv !== undefined) {
				params.ismv = options.ismv.toString()
			}

			params.verified =
				options?.verified === null ? 'null' : String(options?.verified ?? true)

			// Support for multi-artists or artist unique
			if (options?.artistIds && options.artistIds.length > 0) {
				params.artistIds = options.artistIds.join(',')
			} else if (options?.artistId) {
				params.artistIds = options.artistId
			}

			// Support for multi-styles
			if (options?.styles && options.styles.length > 0) {
				params.styles = options.styles.join(',')
			}

			// Call the optimized API endpoint
			const result = await $fetch<PaginatedMusicsResponse>('/api/musics/paginated', {
				params,
				headers: params.verified === 'true' ? undefined : requireAuthHeaders(),
			})

			return result
		} catch (error) {
			console.error('Erreur lors de la récupération des musiques:', error)
			throw error
		}
	}

	return {
		updateMusic,
		updateMusicReleases,
		deleteMusic,
		getMusicsByPage,
	}
}
