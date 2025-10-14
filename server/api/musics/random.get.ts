import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig()
	const supabase = createClient(
		config.public.supabase.url,
		config.supabase.serviceKey,
		{
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false,
			},
		}
	)
	const query = getQuery(event)
	const limit = parseInt(query.limit as string) || 4

	try {
		// Récupérer les musiques avec leurs relations (artistes et releases)
		const { data, error } = await supabase
			.from('musics')
			.select(`
				*,
				artists:music_artists(
					artist:artists(*)
				),
				releases:music_releases(
					release:releases(*)
				)
			`)
			.not('id_youtube_music', 'is', null) // Seulement les musiques avec video
			.limit(limit * 5) // Prendre plus pour avoir de la variété
			.order('created_at', { ascending: false })

		if (error) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed to fetch random musics',
			})
		}

		// Transformer les données pour correspondre au format attendu
		const transformedData = (data || []).map(music => ({
			...music,
			artists: music.artists?.map((junction: any) => junction.artist) || [],
			releases: music.releases?.map((junction: any) => junction.release) || []
		}))

		// Mélanger les résultats avec Fisher-Yates pour éviter les doublons
		const shuffleArray = (array: any[]) => {
			const shuffled = [...array]
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
			}
			return shuffled
		}

		const shuffled = shuffleArray(transformedData).slice(0, limit)

		return shuffled
	} catch (error) {
		console.error('Error fetching random musics:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal server error',
		})
	}
})
