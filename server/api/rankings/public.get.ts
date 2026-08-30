import { uuidSchema } from '../../utils/schemas'
import { validateIntegerParam } from '../../utils/validation'

export default defineEventHandler(async (event) => {
	setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=60')

	const query = getQuery(event)
	const page = validateIntegerParam(query.page, 'page', {
		min: 1,
		max: 10_000,
		defaultValue: 1,
	})
	const limit = validateIntegerParam(query.limit, 'limit', {
		min: 1,
		max: 50,
		defaultValue: 20,
	})
	const userId = query.userId

	if (
		userId !== undefined &&
		(typeof userId !== 'string' || !uuidSchema.safeParse(userId).success)
	) {
		throw createBadRequestError("Parameter 'userId' must be a UUID")
	}

	const offset = (page - 1) * limit
	const supabase = useServerSupabase()
	let rankingsQuery = supabase
		.from('user_rankings')
		.select('*, user:users(id, name, photo_url)', { count: 'exact' })
		.eq('is_public', true)
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1)

	if (typeof userId === 'string') {
		rankingsQuery = rankingsQuery.eq('user_id', userId)
	}

	const { data, count, error } = await rankingsQuery
	if (error) throw handleSupabaseError(error, 'rankings.public')

	return {
		rankings: await buildRankingPreviews(supabase, data ?? []),
		total: count ?? 0,
	}
})
