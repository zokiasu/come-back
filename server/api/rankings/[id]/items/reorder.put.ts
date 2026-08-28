import { rankingReorderSchema } from '../../../../utils/schemas'
import { validateBody } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const rankingId = validateRouteParam(event, 'id', 'Ranking')
	const body = validateBody(await readBody(event), rankingReorderSchema)
	const supabase = useServerSupabase()

	await requireOwnedRanking(supabase, rankingId, user.id)

	const itemIds = body.items.map((item) => item.id)
	const { count, error: itemsError } = await supabase
		.from('user_ranking_items')
		.select('id', { count: 'exact', head: true })
		.eq('ranking_id', rankingId)
		.in('id', itemIds)
	if (itemsError) throw handleSupabaseError(itemsError, 'rankings.items.validate')
	if (count !== itemIds.length) {
		throw createBadRequestError('All reordered items must belong to the ranking')
	}

	const { error } = await supabase.rpc('reorder_ranking_items_server', {
		p_ranking_id: rankingId,
		p_items: body.items,
	})
	if (error) throw handleSupabaseError(error, 'rankings.items.reorder')

	return { success: true }
})
