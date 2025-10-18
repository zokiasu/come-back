import type { Tables } from '~/server/types/api'

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()

	try {
		// Parse query parameters
		const query = getQuery(event)
		const page = Number(query.page) || 1
		const limit = Number(query.limit) || 24
		const search = query.search as string | undefined
		const type = query.type as string | undefined
		const orderBy = (query.orderBy as string) || 'date'
		const orderDirection = (query.orderDirection as string) || 'desc'
		const artistIds = query.artistIds
			? (query.artistIds as string).split(',')
			: undefined
		const verified = query.verified !== undefined
			? query.verified === 'true'
			: undefined

		// Calculate offset
		const offset = (page - 1) * limit

		// Build base query for count
		let countQuery = supabase.from('releases').select('id', { count: 'exact', head: true })

		// Build base query for data
		let dataQuery = supabase.from('releases').select(
			`
				*,
				artists:artist_releases(
					artist:artists(*)
				),
				musics:music_releases(
					music:musics(*)
				),
				platform_links:release_platform_links(*)
			`,
		)

		// If filtering by artists, use inner join
		if (artistIds && artistIds.length > 0) {
			// For count query
			countQuery = supabase
				.from('releases')
				.select('id', { count: 'exact', head: true })
				.in(
					'id',
					supabase.from('artist_releases').select('release_id').in('artist_id', artistIds),
				)

			// For data query
			dataQuery = supabase
				.from('releases')
				.select(
					`
					*,
					artists:artist_releases!inner(
						artist:artists(*)
					),
					musics:music_releases(
						music:musics(*)
					),
					platform_links:release_platform_links(*)
				`,
				)
				.in('artist_releases.artist_id', artistIds)
		}

		// Apply filters to both queries
		if (search) {
			countQuery = countQuery.ilike('name', `%${search}%`)
			dataQuery = dataQuery.ilike('name', `%${search}%`)
		}

		if (type) {
			countQuery = countQuery.eq('type', type)
			dataQuery = dataQuery.eq('type', type)
		}

		if (verified !== undefined) {
			countQuery = countQuery.eq('verified', verified)
			dataQuery = dataQuery.eq('verified', verified)
		}

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
		const transformedData = (dataResult.data || []).map((release) => ({
			...release,
			artists: transformJunction<Tables<'artists'>>(release.artists, 'artist'),
			musics: transformJunction<Tables<'musics'>>(release.musics, 'music'),
			platform_links: release.platform_links || [],
		}))

		const total = countResult.count || 0
		const totalPages = Math.ceil(total / limit)

		return {
			releases: transformedData,
			total,
			page,
			limit,
			totalPages,
		}
	} catch (error) {
		console.error('Error fetching paginated releases:', error)

		// Check if it's a Supabase error
		if (isPostgrestError(error)) {
			throw handleSupabaseError(error, 'releases.paginated')
		}

		// Otherwise, it's an unexpected error
		throw createInternalError('Failed to fetch paginated releases', error)
	}
})
