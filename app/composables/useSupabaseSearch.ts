import type { Artist, ArtistType, Music, Release } from '~/types'
import type { Tables } from '~/types/supabase'
import type { PostgrestError } from '@supabase/supabase-js'

interface SearchResult {
	artists: Artist[]
	totalCount: number
}

interface SearchReleaseResult {
	releases: (Release & {
		artists?: Artist[]
		musics?: Array<{ id_youtube_music?: string | null; name?: string | null }>
	})[]
	totalCount: number
}

interface SearchMusicResult {
	musics: (Music & { artists?: Artist[]; releases?: Release[] })[]
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
	artist_type?: ArtistType
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
			.eq('verified', true)
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
				artist_type: type || undefined,
			}

			const { data: rpcData, error: rpcError } = (await supabase.rpc(
				'search_artists_fulltext',
				rpcParams,
			)) as { data: ArtistWithRelationsRaw[] | null; error: PostgrestError | null }

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

	const searchReleases = async (options: SearchOptions): Promise<SearchReleaseResult> => {
		const { query, limit = 8 } = options

		if (!query || query.trim().length < 2) {
			return { releases: [], totalCount: 0 }
		}

		const { data, error, count } = await supabase
			.from('releases')
			.select(
				`
				id,
				name,
				image,
				date,
				artists:artist_releases!inner(
					artist:artists!inner(id, name, image, verified)
				),
				musics:music_releases(
					music:musics(id, name, id_youtube_music)
				)
			`,
				{ count: 'exact' },
			)
			.eq('artists.artist.verified', true)
			.ilike('name', `%${query.trim()}%`)
			.order('date', { ascending: false })
			.limit(limit)

		if (error) {
			console.error('Error searching releases:', error)
			throw error
		}

		const transformed = (data || []).map((release) => ({
			...release,
			artists:
				release.artists
					?.map(
						(a: { artist: Pick<Artist, 'id' | 'name' | 'image' | 'verified'> }) =>
							a.artist,
					)
					.filter(Boolean) || [],
			musics:
				release.musics
					?.map(
						(m: {
							music: { id_youtube_music?: string | null; name?: string | null } | null
						}) => m.music,
					)
					.filter(Boolean) || [],
		}))

		return {
			releases: transformed as (Release & { artists?: Artist[] })[],
			totalCount: count || 0,
		}
	}

	const searchMusics = async (options: SearchOptions): Promise<SearchMusicResult> => {
		const { query, limit = 8 } = options

		if (!query || query.trim().length < 2) {
			return { musics: [], totalCount: 0 }
		}

		const { data, error, count } = await supabase
			.from('musics')
			.select(
				`
				id,
				name,
				id_youtube_music,
				duration,
				thumbnails,
				date,
				artists:music_artists!inner(
					artist:artists!inner(id, name, image, verified)
				),
				releases:music_releases(
					release:releases(id, name, image)
				)
			`,
				{ count: 'exact' },
			)
			.not('id_youtube_music', 'is', null)
			.eq('artists.artist.verified', true)
			.not('name', 'ilike', '%Inst.%')
			.not('name', 'ilike', '%Instrumental%')
			.not('name', 'ilike', '%Sped Up%')
			.not('name', 'ilike', '%(live)%')
			.not('name', 'ilike', '%[live]%')
			.not('name', 'ilike', '% - Live%')
			.ilike('name', `%${query.trim()}%`)
			.order('date', { ascending: false })
			.limit(limit)

		if (error) {
			console.error('Error searching musics:', error)
			throw error
		}

		const transformed = (data || []).map((music) => ({
			...music,
			artists:
				music.artists
					?.map(
						(a: { artist: Pick<Artist, 'id' | 'name' | 'image' | 'verified'> }) =>
							a.artist,
					)
					.filter(Boolean) || [],
			releases:
				music.releases
					?.map((r: { release: Pick<Release, 'id' | 'name' | 'image'> }) => r.release)
					.filter(Boolean) || [],
		}))

		return {
			musics: transformed as (Music & { artists?: Artist[]; releases?: Release[] })[],
			totalCount: count || 0,
		}
	}

	return {
		searchArtists,
		searchArtistsFullText,
		createDebouncedSearch,
		searchReleases,
		searchMusics,
	}
}
