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

	try {
		// Pour un site international, on utilise UTC avec une logique simple
		// On prend le jour actuel UTC, ce qui est standard pour les apps internationales
		const now = new Date()
		const today = now.toISOString().split('T')[0]

		const { data, error } = await supabase
			.from('news')
			.select(`
				*,
				artists:news_artists_junction(
					artist:artists(*)
				)
			`)
			.gte('date', today) // Seulement les news avec date >= aujourd'hui UTC
			.order('date', { ascending: true }) // Ordre croissant pour les futures dates

		if (error) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed to fetch news',
			})
		}

		// Transform the data to match expected format
		const transformedData = (data || []).map(news => ({
			...news,
			artists: news.artists?.map((junction: any) => junction.artist) || []
		}))

		return transformedData
	} catch (error) {
		console.error('Error fetching latest news:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal server error',
		})
	}
})
