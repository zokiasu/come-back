import type { Artist, News, QueryOptions, FilterOptions } from '~/types'
import type { Database, TablesInsert, TablesUpdate } from '~/types/supabase'

type NewsArtistJunction = { artists: Artist }

interface NewsResponse {
	news: News[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export function useSupabaseNews() {
	const supabase = useSupabaseClient<Database>()
	const toast = useToast()
	const { requireAuthHeaders } = useApiAuthHeaders()
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
		let query = supabase.from('news').select(
			`
				*,
				artists:news_artists_junction(
					artists(*)
				),
				contributions:user_news_contributions(
					user:users(*)
				)
			`,
			{ count: 'exact' },
		)

		if (options?.search) {
			query = query.ilike('message', `%${options.search}%`)
		}

		if (options?.startDate) {
			query = query.gte('date', options.startDate)
		}

		if (options?.endDate) {
			query = query.lte('date', options.endDate)
		}

		if (options?.verified !== undefined) {
			query = query.eq('verified', options.verified)
		}

		// Handle sorting explicitly
		if (options?.orderBy) {
			if (options.orderBy === 'artist') {
				// For artist sorting, fetch all data and sort it client-side
				query = query.order('id', { ascending: true })
			} else {
				// for the autres champs, on utilise the sorting server-side
				query = query.order(options.orderBy, {
					ascending: options.orderDirection === 'asc',
				})
			}
		} else {
			query = query.order('date', { ascending: false })
		}

		if (options?.limit) {
			query = query.limit(options.limit)
		}

		if (options?.offset) {
			query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
		}

		const { data, error, count } = await query

		if (error) {
			console.error('Erreur lors de la récupération des news:', error)
			return {
				news: [],
				total: 0,
				page: 1,
				limit: 10,
				totalPages: 1,
			}
		}

		// Transform data to expose artists and user directly
		const transformedData = data?.map((news) => ({
			...news,
			artists:
				news.artists?.map(
					(artistJunction: NewsArtistJunction) => artistJunction.artists,
				) || [],
			user: news.contributions?.[0]?.user || null,
		}))

		// if sorting is by artist, so sort the results manually
		let sortedData = transformedData as News[]
		if (options?.orderBy === 'artist') {
			console.warn('Tri par artiste appliqué côté client')
			sortedData = sortedData.sort((a, b) => {
				const nameA = a.artists?.[0]?.name || ''
				const nameB = b.artists?.[0]?.name || ''
				return options.orderDirection === 'asc'
					? nameA.localeCompare(nameB)
					: nameB.localeCompare(nameA)
			})
		}

		return {
			news: sortedData,
			total: count || 0,
			page: options?.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1,
			limit: options?.limit || 10,
			totalPages: Math.ceil((count || 0) / (options?.limit || 10)),
		}
	}

	return {
		createNews,
		updateNews,
		updateNewsArtistsRelations,
		deleteNews,
		getAllNews,
	}
}
