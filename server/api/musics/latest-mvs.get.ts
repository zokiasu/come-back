import type { Tables } from '~/server/types/api'

export default defineEventHandler(async (event) => {
	// Cache for 1 hour, stale-while-revalidate for 5 minutes
	setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=300')

	const supabase = useServerSupabase()
	const query = getQuery(event)
	const limit = parseInt((query.limit as string) || '14', 10)

	const { data, error } = await supabase
		.from('musics')
		.select(`
			*,
			artists:music_artists(
				artist:artists(*)
			)
		`)
		.eq('ismv', true) // Seulement les clips musicaux
		.order('date', { ascending: false })
		.limit(limit)

	if (error) {
		throw handleSupabaseError(error, 'musics.latest-mvs')
	}

	// Transformer les données pour extraire les artistes de la jonction
	const transformedData = (data || []).map((music) => ({
		...music,
		artists: transformJunction<Tables<'artists'>>(music.artists, 'artist'),
	}))

	return transformedData
})
