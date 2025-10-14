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
	const limit = parseInt(query.limit as string) || 14

	try {
		const { data, error } = await supabase
			.from('musics')
			.select('*')
			.eq('ismv', true) // Seulement les clips musicaux
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
