export default defineEventHandler(async (event) => {
	const supabase = useSupabaseServiceRole()

	try {
		const { data, error } = await supabase
			.from('news')
			.select('*')
			.order('date', { ascending: true })

		if (error) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed to fetch news',
			})
		}

		return data || []
	} catch (error) {
		console.error('Error fetching latest news:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal server error',
		})
	}
})
