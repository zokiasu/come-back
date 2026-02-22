export default defineEventHandler(async (event) => {
	// Cache for 1 hour, stale-while-revalidate for 5 minutes
	setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=300')

	const supabase = useServerSupabase()
	const query = getQuery(event)
	const limit = validateLimitParam(Number(query.limit), 14)

	const { data, error } = await supabase
		.from('musics')
		.select(
			`
			*,
			artists:music_artists!inner(
				artist:artists!inner(*)
			)
		`,
		)
		.eq('ismv', true) // Seulement les clips musicaux
		.eq('artists.artist.verified', true)
		.order('date', { ascending: false })
		.order('id', { ascending: false })
		.limit(limit)

	if (error) {
		throw handleSupabaseError(error, 'musics.latest-mvs')
	}

	// Transformer les données pour extraire les artistes de la jonction
	const transformedData = (data || []).map((music) => ({
		...music,
		artists: transformJunction(music.artists, 'artist'),
	}))

	return transformedData
})

