export default defineEventHandler(async (event) => {
	const supabase = useSupabaseServiceRole()
	const query = getQuery(event)
	const limit = parseInt(query.limit as string) || 4

	try {
		// Utiliser une requête RPC pour récupérer des musiques aléatoires
		const { data, error } = await supabase.rpc('get_random_musics', {
			limit_count: limit,
		})

		if (error) {
			// Fallback vers une requête normale si RPC n'existe pas
			const { data: fallbackData, error: fallbackError } = await supabase
				.from('musics')
				.select('*')
				.limit(limit * 3) // Prendre plus pour avoir de la variété
				.order('created_at', { ascending: false })

			if (fallbackError) {
				throw createError({
					statusCode: 500,
					statusMessage: 'Failed to fetch random musics',
				})
			}

			// Mélanger les résultats côté serveur
			const shuffled = (fallbackData || [])
				.sort(() => Math.random() - 0.5)
				.slice(0, limit)

			return shuffled
		}

		return data || []
	} catch (error) {
		console.error('Error fetching random musics:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal server error',
		})
	}
})
