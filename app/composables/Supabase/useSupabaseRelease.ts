import type { Release, ReleaseType } from '~/types'
import type { TablesInsert, TablesUpdate } from '~/types/supabase'

export function useSupabaseRelease() {
	const toast = useToast()
	const { requireAuthHeaders } = useApiAuthHeaders()
	const { runMutation } = useMutationTimeout()
	const releaseEndpoint = (id: string): '/api/releases/:id' =>
		`/api/releases/${id}` as '/api/releases/:id'

	// Updates a release
	const updateRelease = async (
		id: string,
		updates: TablesUpdate<'releases'>,
		platformLinks?: TablesInsert<'release_platform_links'>[],
	): Promise<Release | null> => {
		try {
			const data = await runMutation(
				$fetch<Release, '/api/releases/:id'>(releaseEndpoint(id), {
					method: 'PATCH',
					headers: requireAuthHeaders(),
					body: {
						updates,
						platformLinks: platformLinks?.map(({ release_id: _r, ...link }) => link),
					},
				}),
				'Updating the release timed out. Please try again.',
			)
			return data
		} catch (error) {
			console.error('[useSupabaseRelease] updateRelease failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while updating release',
				description: extractErrorMessage(error),
				color: 'error',
			})
			return null
		}
	}

	// Deletes a release
	const deleteRelease = async (id: string) => {
		try {
			await runMutation(
				$fetch<unknown, '/api/releases/:id'>(releaseEndpoint(id), {
					method: 'DELETE',
					headers: requireAuthHeaders(),
				}),
				'Deleting the release timed out. Please try again.',
			)
			return true
		} catch (error) {
			console.error('[useSupabaseRelease] deleteRelease failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while deleting release',
				description: extractErrorMessage(error),
				color: 'error',
			})
			return false
		}
	}

	// Fetches the releases of a month and of a year specific
	const getReleasesByMonthAndYear = async (month: number, year: number) => {
		try {
			return await $fetch<Release[]>('/api/calendar/releases', {
				query: { month, year },
			})
		} catch (error) {
			console.error('Erreur lors de la récupération des releases du mois:', error)
			throw error
		}
	}

	// Fetches releases by page with pagination
	const getReleasesByPage = async (
		page: number,
		limit: number,
		options?: {
			search?: string
			type?: ReleaseType
			orderBy?: keyof Release
			orderDirection?: 'asc' | 'desc'
			verified?: boolean
			artistIds?: string[]
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

			if (options?.type) {
				params.type = options.type
			}

			if (options?.orderBy) {
				params.orderBy = options.orderBy
			}

			if (options?.orderDirection) {
				params.orderDirection = options.orderDirection
			}

			if (options?.artistIds && options.artistIds.length > 0) {
				params.artistIds = options.artistIds.join(',')
			}

			if (options?.verified !== undefined) {
				params.verified = String(options.verified)
			}

			// Call the optimized API endpoint
			const result = await $fetch('/api/releases/paginated', {
				params,
				headers: requireAuthHeaders(),
			})

			return result
		} catch (error) {
			console.error('Erreur lors de la récupération des releases:', error)
			throw error
		}
	}

	return {
		updateRelease,
		deleteRelease,
		getReleasesByMonthAndYear,
		getReleasesByPage,
	}
}
