import type { Artist } from '~/types'

interface SearchResult {
	artists: Artist[]
	totalCount: number
}

interface SearchOptions {
	query: string
	limit?: number
	type?: 'SOLO' | 'GROUP'
}

export function useSupabaseSearch() {
	const supabase = useSupabaseClient()

	// Search artists with full-text search capabilities
	const searchArtists = async (options: SearchOptions): Promise<SearchResult> => {
		const { query, limit = 10, type } = options

		if (!query || query.trim().length < 2) {
			return { artists: [], totalCount: 0 }
		}

		let supabaseQuery = supabase
			.from('artists')
			.select(
				`
				*,
				social_links:artist_social_links(*),
				platform_links:artist_platform_links(*),
				companies:artist_companies(
					*,
					company:companies(*)
				)
			`,
				{ count: 'exact' },
			)
			.ilike('name', `%${query.trim()}%`)
			.order('name', { ascending: true })
			.limit(limit)

		// Add type filter if specified
		if (type) {
			supabaseQuery = supabaseQuery.eq('type', type)
		}

		const { data, error, count } = await supabaseQuery

		if (error) {
			console.error('Error searching artists:', error)
			throw error
		}

		// Transformer les données pour assurer que les tableaux sont toujours définis
		const transformedData = (data || []).map((artist: any) => ({
			...artist,
			social_links: artist.social_links || [],
			platform_links: artist.platform_links || [],
			companies: artist.companies || [],
			styles: artist.styles || [],
		}))

		return {
			artists: transformedData as Artist[],
			totalCount: count || 0,
		}
	}

	// Enhanced search with PostgreSQL full-text search
	const searchArtistsFullText = async (options: SearchOptions): Promise<SearchResult> => {
		const { query, limit = 10, type } = options

		if (!query || query.trim().length < 2) {
			return { artists: [], totalCount: 0 }
		}

		try {
			// Use the RPC function for optimized search
			const { data: rpcData, error: rpcError } = (await supabase.rpc(
				'search_artists_fulltext',
				{
					search_query: query.trim(),
					result_limit: limit,
					artist_type: type || null,
				} as any,
			)) as { data: any[] | null; error: any }

			if (rpcError) {
				console.error('RPC search error, falling back to ILIKE:', rpcError)
				return searchArtists(options)
			}

			if (rpcData) {
				// Transformer les données JSON en objets
				const transformedData = rpcData.map((artist: any) => ({
					...artist,
					social_links: artist.social_links || [],
					platform_links: artist.platform_links || [],
					companies: artist.companies || [],
					styles: artist.styles || [],
				}))

				return {
					artists: transformedData as Artist[],
					totalCount: rpcData.length,
				}
			}
		} catch (error) {
			console.error('Full-text search error, falling back to ILIKE search:', error)
		}

		// Fallback to regular ILIKE search
		return searchArtists(options)
	}

	// Simple debounced search helper
	const createDebouncedSearch = (delay = 300) => {
		return useDebounce(searchArtistsFullText, delay)
	}

	return {
		searchArtists,
		searchArtistsFullText,
		createDebouncedSearch,
	}
}
