export default defineEventHandler(async (event) => {
	// Cache for 1 hour, stale-while-revalidate for 5 minutes
	setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=300')

	const supabase = useServerSupabase()
	const query = getQuery(event)
	const limit = validateLimitParam(Number(query.limit), 14)

	const { data: page, error: pageError } = await supabase
		.from('musics')
		.select('id, artists:music_artists!inner(artist:artists!inner())')
		.eq('ismv', true)
		.eq('verified', true)
		.eq('artists.artist.verified', true)
		.order('date', { ascending: false })
		.order('id', { ascending: false })
		.limit(limit)

	if (pageError) throw handleSupabaseError(pageError, 'musics.latest-mvs.ids')
	const ids = (page || []).map((music) => music.id)
	if (ids.length === 0) return []

	const { data, error } = await supabase
		.from('musics')
		.select('*, artists:music_artists!inner(artist:artists!inner(*))')
		.in('id', ids)
		.eq('ismv', true)
		.eq('verified', true)
		.eq('artists.artist.verified', true)
	if (error) throw handleSupabaseError(error, 'musics.latest-mvs.details')
	const positions = new Map(ids.map((id, index) => [id, index]))
	data?.sort(
		(left, right) => (positions.get(left.id) ?? 0) - (positions.get(right.id) ?? 0),
	)

	// Transform the data for extraire the artists the junction
	const transformedData = (data || []).map((music) => ({
		...music,
		artists: transformJunction(music.artists, 'artist'),
	}))

	return transformedData
})
