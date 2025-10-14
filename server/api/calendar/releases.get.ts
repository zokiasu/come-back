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
	const month = parseInt(query.month as string) || new Date().getMonth()
	const year = parseInt(query.year as string) || new Date().getFullYear()

	// Valider les paramètres (month is 0-based from frontend)
	if (month < 0 || month > 11) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Month must be between 0 and 11',
		})
	}

	if (year < 1900 || year > 2100) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Year must be between 1900 and 2100',
		})
	}

	try {
		// Créer les dates de début et fin du mois (month is 0-based)
		const startDate = new Date(year, month, 1).toISOString().split('T')[0]
		const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

		const { data, error } = await supabase
			.from('releases')
			.select(`
				*,
				artists:release_artists(
					artist:artists(*)
				)
			`)
			.gte('date', startDate)
			.lte('date', endDate)
			.order('date', { ascending: false })

		if (error) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed to fetch releases',
			})
		}

		// Transformer les données pour correspondre au format attendu
		const transformedData = (data || []).map(release => ({
			...release,
			artists: release.artists?.map((junction: any) => junction.artist) || []
		}))

		return transformedData
	} catch (error) {
		console.error('Error fetching calendar releases:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal server error',
		})
	}
})