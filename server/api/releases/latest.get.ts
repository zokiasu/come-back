export default defineEventHandler(async (event) => {
	// Cache for 1 hour, stale-while-revalidate for 5 minutes
	setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=300')

	const supabase = useServerSupabase()
	const query = getQuery(event)
	const limit = validateLimitParam(Number(query.limit), 8)

	const { data, error } = await supabase
		.from('releases')
		.select(
			`
			*,
			artists:artist_releases!inner(
				artist:artists!inner(*)
			)
		`,
		)
		.eq('artists.artist.verified', true)
		.order('date', { ascending: false })
		.limit(limit)

	if (error) {
		throw handleSupabaseError(error, 'releases.latest')
	}

	// Transform the data to extract artists from junction table
	const transformedData = (data || []).map((release) => ({
		...release,
		artists: transformJunction(release.artists, 'artist'),
	}))

	return transformedData
})
