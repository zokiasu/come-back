import type { Tables } from '#server/types/api'
import {
	applyMusicFilters,
	applyMusicNameExclusions,
	applyVerifiedArtistFilter,
} from '#server/utils/queryFilters'

const ALLOWED_ORDER_COLUMNS = ['date', 'name', 'created_at', 'release_year'] as const
type MusicWithRelations = Tables<'musics'> & {
	artists?: Array<{ artist: Tables<'artists'> | null }>
	releases?: Array<{ release: Tables<'releases'> | null }>
}

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()

	try {
		// Parse and validate query parameters
		const query = getQuery(event)
		const page = validatePageParam(Number(query.page))
		const limit = validateLimitParam(Number(query.limit), 20)
		const search = validateSearchParam(query.search as string | undefined)
		const years = validateNumericArrayParam(query.years as string | undefined, 'years')
		const orderBy = validateOrderBy(
			query.orderBy as string,
			ALLOWED_ORDER_COLUMNS,
			'date',
		)
		const orderDirection = validateOrderDirection(query.orderDirection as string, 'desc')
		const ismv = query.ismv === 'true' ? true : query.ismv === 'false' ? false : undefined
		const artistIds = validateArrayParam(
			query.artistIds as string | undefined,
			'artistIds',
		)
		const styles = validateArrayParam(query.styles as string | undefined, 'styles')

		// Calculate offset
		const offset = (page - 1) * limit

		// Use optimized RPC function when filtering by styles (avoids large IN clauses)
		if (styles && styles.length > 0) {
			const { data: rpcData, error: rpcError } = await supabase.rpc(
				'get_paginated_musics_by_styles',
				{
					style_filters: styles,
					search_term: search || undefined,
					year_filters: years || undefined,
					is_mv: ismv ?? undefined,
					order_column: orderBy,
					order_dir: orderDirection,
					page_limit: limit,
					page_offset: offset,
				},
			)

			if (rpcError) {
				console.error('Error fetching musics by styles:', rpcError)
				throw rpcError
			}

			const musicIds = rpcData?.map((m: { id: string }) => m.id) || []
			const total = rpcData?.[0]?.total_count || 0

			// Fetch full music data with relations for the filtered IDs
			let musicsWithRelations: MusicWithRelations[] = []
			if (musicIds.length > 0) {
				let dataQuery = supabase
					.from('musics')
					.select(
						`
						*,
						artists:music_artists!inner(
							artist:artists!inner(*)
						),
						releases:music_releases(
							release:releases(*)
						)
					`,
					)
				dataQuery = applyVerifiedArtistFilter(dataQuery)
				const { data: fullData, error: fullError } = await dataQuery.in('id', musicIds)

				if (fullError) throw fullError

				// Preserve the order from RPC by sorting according to musicIds order
				const idOrderMap = new Map(musicIds.map((id, index) => [id, index]))
				musicsWithRelations = (fullData || []).sort(
					(a, b) => (idOrderMap.get(a.id) ?? 0) - (idOrderMap.get(b.id) ?? 0),
				)
			}

			const transformedData = musicsWithRelations.map((music) => ({
				...music,
				artists: transformJunction(music.artists, 'artist'),
				releases: transformJunction(music.releases, 'release'),
			}))

			const totalPages = Math.ceil(Number(total) / limit)

			return {
				musics: transformedData,
				total: Number(total),
				page,
				limit,
				totalPages,
			}
		}

		// Standard query path (no style filter)
		let musicIdsToFilter: string[] | undefined

		// Filter by specific artists
		if (artistIds && artistIds.length > 0) {
			const { data: musicArtistsData, error: musicArtistsError } = await supabase
				.from('music_artists')
				.select('music_id')
				.in('artist_id', artistIds)

			if (musicArtistsError) throw musicArtistsError

			musicIdsToFilter = [...new Set(musicArtistsData?.map((ma) => ma.music_id) || [])]
		}

		// Build base query for count
		let countQuery = supabase.from('musics').select('id', { count: 'exact', head: true })

		// Build base query for data
		let dataQuery = supabase
			.from('musics')
			.select(
				`
				*,
				artists:music_artists!inner(
					artist:artists!inner(*)
				),
				releases:music_releases(
					release:releases(*)
				)
			`,
			)
		dataQuery = applyVerifiedArtistFilter(dataQuery)
		countQuery = applyVerifiedArtistFilter(countQuery)

		// Apply artist filter if specified
		if (musicIdsToFilter !== undefined) {
			if (musicIdsToFilter.length > 0) {
				countQuery = countQuery.in('id', musicIdsToFilter)
				dataQuery = dataQuery.in('id', musicIdsToFilter)
			} else {
				// Empty array means no results should be returned
				countQuery = countQuery.eq('id', '00000000-0000-0000-0000-000000000000')
				dataQuery = dataQuery.eq('id', '00000000-0000-0000-0000-000000000000')
			}
		}

		// Apply filters to both queries
		countQuery = applyMusicFilters(countQuery, { search, years, ismv })
		dataQuery = applyMusicFilters(dataQuery, { search, years, ismv })

		// Exclude instrumental, sped up, and live versions
		countQuery = applyMusicNameExclusions(countQuery)
		dataQuery = applyMusicNameExclusions(dataQuery)

		// Apply sorting only to data query
		dataQuery = dataQuery.order(orderBy, { ascending: orderDirection === 'asc' })

		// Apply pagination only to data query
		dataQuery = dataQuery.range(offset, offset + limit - 1)

		// Execute both queries in parallel
		const [countResult, dataResult] = await Promise.all([countQuery, dataQuery])

		// Check errors
		if (countResult.error) throw countResult.error
		if (dataResult.error) throw dataResult.error

		// Transform data to extract junction relations
		const transformedData = (dataResult.data || []).map((music) => ({
			...music,
			artists: transformJunction(music.artists, 'artist'),
			releases: transformJunction(music.releases, 'release'),
		}))

		const total = countResult.count || 0
		const totalPages = Math.ceil(total / limit)

		return {
			musics: transformedData,
			total,
			page,
			limit,
			totalPages,
		}
	} catch (error) {
		console.error('Error fetching paginated musics:', error)

		// Check if it's a Supabase error
		if (isPostgrestError(error)) {
			throw handleSupabaseError(error, 'musics.paginated')
		}

		// Otherwise, it's an unexpected error
		throw createInternalError('Failed to fetch paginated musics', error)
	}
})

