import { VALIDATION_LIMITS, validateIntegerParam } from '../../utils/validation'

export default defineEventHandler(async (event) => {
	// Cache for 24 hours, stale-while-revalidate for 1 hour (calendar data is stable)
	setHeader(event, 'Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')

	const supabase = useServerSupabase()
	const query = getQuery(event)
	const now = new Date()
	const month = validateIntegerParam(query.month, 'month', {
		min: 0,
		max: 11,
		defaultValue: now.getMonth(),
	})
	const year = validateIntegerParam(query.year, 'year', {
		min: VALIDATION_LIMITS.MIN_YEAR,
		max: VALIDATION_LIMITS.MAX_YEAR,
		defaultValue: now.getFullYear(),
	})

	// Create the start and end dates of the month (month is 0-based)
	const monthNumber = String(month + 1).padStart(2, '0')
	const lastDayOfMonth = String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')
	const startDate = `${year}-${monthNumber}-01`
	const endDate = `${year}-${monthNumber}-${lastDayOfMonth}`

	const { data, error } = await supabase
		.from('releases')
		.select(
			`
			*,
			artists:artist_releases!inner(
				artist:artists!inner(*)
			)
		`,
		)
		.eq('verified', true)
		.eq('artists.artist.verified', true)
		.gte('date', startDate)
		.lte('date', endDate)
		.order('date', { ascending: false })

	if (error) {
		throw handleSupabaseError(error, 'calendar.releases')
	}

	// Transform the data to match the expected format
	const transformedData = (data || []).map((release) => ({
		...release,
		artists: transformJunction(release.artists, 'artist'),
	}))

	return transformedData
})
