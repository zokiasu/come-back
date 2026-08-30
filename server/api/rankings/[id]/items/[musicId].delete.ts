export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const rankingId = validateRouteParam(event, 'id', 'Ranking')
	const musicId = validateRouteParam(event, 'musicId', 'Music')
	const supabase = useServerSupabase()

	await requireOwnedRanking(supabase, rankingId, user.id)

	const { data: item, error: itemError } = await supabase
		.from('user_ranking_items')
		.select('position')
		.eq('ranking_id', rankingId)
		.eq('music_id', musicId)
		.maybeSingle()
	if (itemError) throw handleSupabaseError(itemError, 'rankings.items.get')
	if (!item) throw createNotFoundError('Ranking item', musicId)

	const { error: deleteError } = await supabase
		.from('user_ranking_items')
		.delete()
		.eq('ranking_id', rankingId)
		.eq('music_id', musicId)
	if (deleteError) throw handleSupabaseError(deleteError, 'rankings.items.delete')

	const { error: reorderError } = await supabase.rpc(
		'reorder_ranking_items_after_delete',
		{
			p_ranking_id: rankingId,
			p_deleted_position: item.position,
		},
	)
	if (reorderError) throw handleSupabaseError(reorderError, 'rankings.items.compact')

	await supabase
		.from('user_rankings')
		.update({ updated_at: new Date().toISOString() })
		.eq('id', rankingId)
		.eq('user_id', user.id)

	return { success: true }
})
