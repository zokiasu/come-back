import type { Tables } from '~/server/types/api'

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()
	const query = getQuery(event)
	const limit = parseInt((query.limit as string) || '14', 10)

	const { data, error } = await supabase
		.from('musics')
		.select('*')
		.eq('ismv', true) // Seulement les clips musicaux
		.order('date', { ascending: false })
		.limit(limit)

	if (error) {
		throw handleSupabaseError(error, 'musics.latest-mvs')
	}

	return (data || []) as Tables<'musics'>[]
})
