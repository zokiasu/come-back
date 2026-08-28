import { rankingUpdateSchema } from '../../../utils/schemas'
import { validateBody } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const rankingId = validateRouteParam(event, 'id', 'Ranking')
	const body = validateBody(await readBody(event), rankingUpdateSchema)
	const supabase = useServerSupabase()

	await requireOwnedRanking(supabase, rankingId, user.id)

	const { data, error } = await supabase
		.from('user_rankings')
		.update({ ...body, updated_at: new Date().toISOString() })
		.eq('id', rankingId)
		.eq('user_id', user.id)
		.select()
		.single()

	if (error) throw handleSupabaseError(error, 'rankings.update')

	return data
})
