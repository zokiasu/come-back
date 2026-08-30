import type { News, QueryOptions, FilterOptions } from '~/types'
import type { TablesInsert, TablesUpdate } from '~/types/supabase'

interface NewsResponse {
	news: News[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export function useSupabaseNews() {
	const toast = useToast()
	const { requireAuthHeaders, getAuthHeaders } = useApiAuthHeaders()
	const { runMutation } = useMutationTimeout()

	// Creates a nouvelle news
	const createNews = async (
		data: TablesInsert<'news'>,
		artistIds: string[],
	): Promise<News> => {
		if (!artistIds || artistIds.length === 0) {
			throw new Error('Les artistes sont requis pour créer une news')
		}

		if (!data.message) {
			throw new Error('Le message est requis pour créer une news')
		}

		return runMutation(
			$fetch<News>('/api/news', {
				method: 'POST',
				headers: requireAuthHeaders(),
				body: { data, artistIds },
			}),
			'The comeback request timed out while creating the report.',
		)
	}

	// Updates a news
	const updateNews = async (
		id: string,
		updates: TablesUpdate<'news'>,
	): Promise<News | null> => {
		try {
			return await runMutation(
				$fetch<News>(`/api/news/${id}`, {
					method: 'PATCH',
					headers: requireAuthHeaders(),
					body: { updates },
				}),
				'Updating the report timed out. Please try again.',
			)
		} catch (error) {
			console.error('[useSupabaseNews] updateNews failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Erreur',
				description: extractErrorMessage(error),
				color: 'error',
			})
			return null
		}
	}

	const updateNewsArtistsRelations = async (id: string, artistIds?: string[]) => {
		try {
			await runMutation(
				$fetch(`/api/news/${id}`, {
					method: 'PATCH',
					headers: requireAuthHeaders(),
					body: { artistIds },
				}),
				'Linking artists to the report timed out. Please try again.',
			)
			return true
		} catch (error) {
			console.error('[useSupabaseNews] updateNewsArtistsRelations failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Erreur',
				description: extractErrorMessage(error),
				color: 'error',
			})
			return false
		}
	}

	// Deletes a news
	const deleteNews = async (id: string) => {
		try {
			await runMutation(
				$fetch(`/api/news/${id}`, {
					method: 'DELETE',
					headers: requireAuthHeaders(),
				}),
				'Deleting the report timed out. Please try again.',
			)
			return true
		} catch (error) {
			console.error('[useSupabaseNews] deleteNews failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Erreur',
				description: extractErrorMessage(error),
				color: 'error',
			})
			return false
		}
	}

	// Fetch all news
	const getAllNews = async (
		options?: QueryOptions & FilterOptions,
	): Promise<NewsResponse> => {
		const query: Record<string, string | number | boolean> = {}
		if (options?.search) query.search = options.search
		if (options?.startDate) query.startDate = options.startDate
		if (options?.endDate) query.endDate = options.endDate
		if (options?.verified !== undefined) query.verified = options.verified
		if (options?.orderBy) query.orderBy = options.orderBy
		if (options?.orderDirection) query.orderDirection = options.orderDirection
		if (options?.limit) query.limit = options.limit
		if (options?.offset !== undefined) query.offset = options.offset

		return $fetch<NewsResponse>('/api/news/paginated', {
			query,
			headers: getAuthHeaders(),
		})
	}

	return {
		createNews,
		updateNews,
		updateNewsArtistsRelations,
		deleteNews,
		getAllNews,
	}
}
