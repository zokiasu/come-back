import type { Tables } from '~/server/types/api'

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()

	try {
		// Parse query parameters
		const query = getQuery(event)
		const page = Number(query.page) || 1
		const limit = Number(query.limit) || 20
		const search = query.search as string | undefined
		const years = query.years
			? (query.years as string).split(',').filter(Boolean).map(Number)
			: undefined
		const orderBy = (query.orderBy as string) || 'date'
		const orderDirection = (query.orderDirection as string) || 'desc'
		const ismv = query.ismv === 'true' ? true : query.ismv === 'false' ? false : undefined
		const artistIds = query.artistIds
			? (query.artistIds as string).split(',').filter(Boolean)
			: undefined
		const styles = query.styles
			? (query.styles as string).split(',').filter(Boolean)
			: undefined

		// Calculate offset
		const offset = (page - 1) * limit

		// If filtering by artists or styles, first get the music IDs
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

		// Filter by artist styles
		if (styles && styles.length > 0) {
			const { data: artistsWithStyles, error: artistsError } = await supabase
				.from('artists')
				.select('id')
				.overlaps('styles', styles)

			if (artistsError) throw artistsError

			const artistIdsWithStyles = artistsWithStyles?.map((a) => a.id) || []

			if (artistIdsWithStyles.length > 0) {
				const { data: musicsByStyles, error: musicStylesError } = await supabase
					.from('music_artists')
					.select('music_id')
					.in('artist_id', artistIdsWithStyles)

				if (musicStylesError) throw musicStylesError

				const musicIdsFromStyles = [
					...new Set(musicsByStyles?.map((ma) => ma.music_id) || []),
				]

				// Union with existing filter (combine both artist and style filters)
				if (musicIdsToFilter) {
					musicIdsToFilter = [...new Set([...musicIdsToFilter, ...musicIdsFromStyles])]
				} else {
					musicIdsToFilter = musicIdsFromStyles
				}
			}
		}

		// Build base query for count
		let countQuery = supabase.from('musics').select('id', { count: 'exact', head: true })

		// Build base query for data
		let dataQuery = supabase.from('musics').select(
			`
				*,
				artists:music_artists(
					artist:artists(*)
				),
				releases:music_releases(
					release:releases(*)
				)
			`,
		)

		// Apply artist filter if we have music IDs
		if (musicIdsToFilter && musicIdsToFilter.length > 0) {
			countQuery = countQuery.in('id', musicIdsToFilter)
			dataQuery = dataQuery.in('id', musicIdsToFilter)
		}

		// Apply filters to both queries
		if (search) {
			countQuery = countQuery.ilike('name', `%${search}%`)
			dataQuery = dataQuery.ilike('name', `%${search}%`)
		}

		if (years && years.length > 0) {
			countQuery = countQuery.in('release_year', years)
			dataQuery = dataQuery.in('release_year', years)
		}

		if (ismv !== undefined) {
			countQuery = countQuery.eq('ismv', ismv)
			dataQuery = dataQuery.eq('ismv', ismv)
		}

		// Exclude instrumental and sped up versions
		countQuery = countQuery.not('name', 'ilike', '%Inst.%')
		countQuery = countQuery.not('name', 'ilike', '%Instrumental%')
		countQuery = countQuery.not('name', 'ilike', '%Sped Up%')

		dataQuery = dataQuery.not('name', 'ilike', '%Inst.%')
		dataQuery = dataQuery.not('name', 'ilike', '%Instrumental%')
		dataQuery = dataQuery.not('name', 'ilike', '%Sped Up%')

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
			artists: transformJunction<Tables<'artists'>>(music.artists, 'artist'),
			releases: transformJunction<Tables<'releases'>>(music.releases, 'release'),
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
