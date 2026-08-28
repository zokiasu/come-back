export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	setHeader(event, 'Cache-Control', 'private, no-store')

	const supabase = useServerSupabase()
	const { data, error } = await supabase
		.from('user_rankings')
		.select('*')
		.eq('user_id', user.id)
		.order('updated_at', { ascending: false })

	if (error) throw handleSupabaseError(error, 'rankings.list')

	return buildRankingPreviews(supabase, data ?? [])
})
