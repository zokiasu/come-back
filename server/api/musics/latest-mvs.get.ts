export default defineEventHandler(async (event) => {
	const supabase = useSupabaseServiceRole()
	const query = getQuery(event)
	const limit = parseInt(query.limit as string) || 14

	try {
		const { data, error } = await supabase
			.from('musics')
			.select('*')
			.not('id_youtube', 'is', null) // Seulement les musiques avec vidéo
			.order('date', { ascending: false })
			.limit(limit)

		if (error) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed to fetch latest MVs',
			})
		}

		return data || []
	} catch (error) {
		console.error('Error fetching latest MVs:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal server error',
		})
	}
})
