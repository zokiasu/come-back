import type { Tables } from '#server/types/api'

export default defineEventHandler(async (event) => {
	// Cache for 30 minutes, stale-while-revalidate for 5 minutes
	setHeader(event, 'Cache-Control', 'public, max-age=1800, stale-while-revalidate=300')

	const supabase = useServerSupabase()

	// Pour un site international, on utilise UTC avec une logique simple
	// On prend le jour actuel UTC, ce qui est standard pour les apps internationales
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
		.gte('date', today) // Seulement les news avec date >= aujourd'hui UTC
		.order('date', { ascending: true }) // Ordre croissant pour les futures dates

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

