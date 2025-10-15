import type { Tables } from '~/server/types/api'

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()
	const query = getQuery(event)
	const limit = parseInt((query.limit as string) || '8', 10)

	const { data, error } = await supabase
		.from('artists')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(limit)

	if (error) {
		throw handleSupabaseError(error, 'artists.latest')
	}

	return (data || []) as Tables<'artists'>[]
})
