export default defineEventHandler(async (event) => {
	// Cache for 30 minutes, stale-while-revalidate for 5 minutes
	setHeader(event, 'Cache-Control', 'public, max-age=1800, stale-while-revalidate=300')

	const supabase = useServerSupabase()

	// Use UTC here for a cross-timezone feed
	// Use the current UTC day as the comparison baseline
	const now = new Date()
	const today = now.toISOString().split('T')[0]

	const { data, error } = await supabase
		.from('news')
		.select(
			`
			*,
			artists:news_artists_junction(
				artist:artists(*)
			)
		`,
		)
		.eq('artists.artist.verified', true)
		.gte('date', today) // Only news dated today or later in UTC
		.order('date', { ascending: true }) // Ascending order for upcoming dates

	if (error) {
		throw handleSupabaseError(error, 'news.latest')
	}

	// Transform the data to match expected format
	const transformedData = (data || []).map((news) => ({
		...news,
		artists: transformJunction(news.artists, 'artist'),
	}))

	return transformedData
})
