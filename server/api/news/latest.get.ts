import type { Tables } from '~/server/types/api'

export default defineEventHandler(async () => {
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
		.gte('date', today) // Seulement les news avec date >= aujourd'hui UTC
		.order('date', { ascending: true }) // Ordre croissant pour les futures dates

	if (error) {
		throw handleSupabaseError(error, 'news.latest')
	}

	// Transform the data to match expected format
	const transformedData = (data || []).map((news) => ({
		...news,
		artists: transformJunction<Tables<'artists'>>(news.artists, 'artist'),
	}))

	return transformedData
})
