import { rankingItemSchema } from '../../../../utils/schemas'
import { validateBody } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const rankingId = validateRouteParam(event, 'id', 'Ranking')
	const body = validateBody(await readBody(event), rankingItemSchema)
	const supabase = useServerSupabase()

	await requireOwnedRanking(supabase, rankingId, user.id)

	const { data: music, error: musicError } = await supabase
		.from('musics')
		.select('id')
		.eq('id', body.music_id)
		.eq('verified', true)
		.maybeSingle()
	if (musicError) throw handleSupabaseError(musicError, 'rankings.music')
	if (!music) throw createNotFoundError('Music', body.music_id)

	const { data: lastItem, error: positionError } = await supabase
		.from('user_ranking_items')
		.select('position')
		.eq('ranking_id', rankingId)
		.order('position', { ascending: false })
		.limit(1)
		.maybeSingle()
	if (positionError) throw handleSupabaseError(positionError, 'rankings.position')

	const position = (lastItem?.position ?? 0) + 1
	if (position > 100) {
		throw createBadRequestError('A ranking cannot contain more than 100 tracks')
	}

	const { data, error } = await supabase
		.from('user_ranking_items')
		.insert({ ranking_id: rankingId, music_id: body.music_id, position })
		.select()
		.single()
	if (error) throw handleSupabaseError(error, 'rankings.items.add')

	await supabase
		.from('user_rankings')
		.update({ updated_at: new Date().toISOString() })
		.eq('id', rankingId)
		.eq('user_id', user.id)

	return data
})
