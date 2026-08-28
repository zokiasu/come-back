export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const rankingId = validateRouteParam(event, 'id', 'Ranking')
	const supabase = useServerSupabase()

	await requireOwnedRanking(supabase, rankingId, user.id)

	const { error } = await supabase
		.from('user_rankings')
		.delete()
		.eq('id', rankingId)
		.eq('user_id', user.id)

	if (error) throw handleSupabaseError(error, 'rankings.delete')

	return { success: true }
})
