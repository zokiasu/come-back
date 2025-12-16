import type { Artist, ArtistType } from '~/types'
import type { Tables } from '~/types/supabase'
import type { PostgrestError } from '@supabase/supabase-js'

interface SearchResult {
	artists: Artist[]
	totalCount: number
}

interface SearchOptions {
	query: string
	limit?: number
	type?: ArtistType
}

// Type pour les données brutes de l'artiste avec relations
type ArtistWithRelationsRaw = Tables<'artists'> & {
	social_links?: Tables<'artist_social_links'>[] | null
	platform_links?: Tables<'artist_platform_links'>[] | null
	companies?: (Tables<'artist_companies'> & { company: Tables<'companies'> })[] | null
}

// Type pour les paramètres RPC
interface SearchArtistsRpcParams {
	search_query: string
	result_limit: number
	artist_type: ArtistType | null
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
		const transformedData = (data || []).map((artist: ArtistWithRelationsRaw) => ({
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
			const rpcParams: SearchArtistsRpcParams = {
				search_query: query.trim(),
				result_limit: limit,
				artist_type: type || null,
			}

			const { data: rpcData, error: rpcError } = await supabase.rpc(
				'search_artists_fulltext',
				rpcParams,
			) as { data: ArtistWithRelationsRaw[] | null; error: PostgrestError | null }

			if (rpcError) {
				console.error('RPC search error, falling back to ILIKE:', rpcError)
				return searchArtists(options)
			}

			if (rpcData) {
				// Transformer les données JSON en objets
				const transformedData = rpcData.map((artist: ArtistWithRelationsRaw) => ({
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
