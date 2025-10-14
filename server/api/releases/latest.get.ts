export default defineEventHandler(async (event) => {
	const supabase = useSupabaseServiceRole()
	const query = getQuery(event)
	const limit = parseInt(query.limit as string) || 8

	try {
		const { data, error } = await supabase
			.from('releases')
			.select('*')
			.order('date', { ascending: false })
			.limit(limit)

		if (error) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed to fetch releases',
			})
		}

		return data || []
	} catch (error) {
		console.error('Error fetching latest releases:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal server error',
		})
	}
})
