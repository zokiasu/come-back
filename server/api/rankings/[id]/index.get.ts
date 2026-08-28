export default defineEventHandler(async (event) => {
	setHeader(event, 'Cache-Control', 'private, no-store')

	const rankingId = validateRouteParam(event, 'id', 'Ranking')
	const currentUser = await getAuthenticatedUser(event)
	const supabase = useServerSupabase()
	const { data, error } = await supabase
		.from('user_rankings')
		.select('*, user:users(id, name, photo_url)')
		.eq('id', rankingId)
		.maybeSingle()

	if (error) throw handleSupabaseError(error, 'rankings.get')
	if (!data || (!data.is_public && data.user_id !== currentUser?.id)) {
		throw createNotFoundError('Ranking', rankingId)
	}

	return fetchRankingWithItems(supabase, data)
})
