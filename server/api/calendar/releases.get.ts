import type { Tables } from '~/server/types/api'

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()
	const query = getQuery(event)
	const month = parseInt((query.month as string) || String(new Date().getMonth()), 10)
	const year = parseInt((query.year as string) || String(new Date().getFullYear()), 10)

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

	// Créer les dates de début et fin du mois (month is 0-based)
	const startDate = new Date(year, month, 1).toISOString().split('T')[0]
	const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

	const { data, error } = await supabase
		.from('releases')
		.select(
			`
			*,
			artists:artist_releases(
				artist:artists(*)
			)
		`,
		)
		.gte('date', startDate)
		.lte('date', endDate)
		.order('date', { ascending: false })

	if (error) {
		throw handleSupabaseError(error, 'calendar.releases')
	}

	// Transformer les données pour correspondre au format attendu
	const transformedData = (data || []).map((release) => ({
		...release,
		artists: transformJunction<Tables<'artists'>>(release.artists, 'artist'),
	}))

	return transformedData
})
