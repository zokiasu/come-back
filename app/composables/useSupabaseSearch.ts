import type { Artist } from '~/types'

interface SearchResult {
	artists: Artist[]
	totalCount: number
}

interface SearchOptions {
	query: string
	limit?: number
	type?: 'SOLO' | 'GROUP' | 'BAND'
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
			.select('*', { count: 'exact' })
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
		
		return {
			artists: data || [],
			totalCount: count || 0
		}
	}
	
	// Enhanced search with PostgreSQL full-text search (if available)
	const searchArtistsFullText = async (options: SearchOptions): Promise<SearchResult> => {
		const { query, limit = 10, type } = options
		
		if (!query || query.trim().length < 2) {
			return { artists: [], totalCount: 0 }
		}
		
		try {
			// Try full-text search first (requires tsvector setup on database)
			const { data: rpcData, error: rpcError } = await supabase
				.rpc('search_artists_fulltext', {
					search_query: query.trim(),
					result_limit: limit,
					artist_type: type || null
				})
			
			if (!rpcError && rpcData) {
				return {
					artists: rpcData,
					totalCount: rpcData.length
				}
			}
		} catch (error) {
			console.warn('Full-text search not available, falling back to ILIKE search')
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
		createDebouncedSearch
	}
}