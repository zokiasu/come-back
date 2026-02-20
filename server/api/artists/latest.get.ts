import type { Tables } from '#server/types/api'

export default defineEventHandler(async (event) => {
	// Cache for 1 hour, stale-while-revalidate for 5 minutes
	setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=300')

	const supabase = useServerSupabase()
	const query = getQuery(event)
	const limit = validateLimitParam(Number(query.limit), 8)

	const { data, error } = await supabase
		.from('artists')
		.select('*')
		.eq('verified', true)
		.order('created_at', { ascending: false })
		.limit(limit)

	if (error) {
		throw handleSupabaseError(error, 'artists.latest')
	}

	return (data || []) as Tables<'artists'>[]
})
