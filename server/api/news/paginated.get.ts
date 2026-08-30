import type { Tables } from '../../types/api'
import type { NewsPageResponse } from '~/types/api'
import { validateIntegerParam } from '../../utils/validation'

const NEWS_ORDER_COLUMNS = ['date', 'created_at', 'message', 'verified'] as const

type RawNews = Tables<'news'> & {
	artists?: { artist: Tables<'artists'> | null }[]
	contributions?: { user: Tables<'users'> | null }[]
}

export default defineEventHandler(async (event): Promise<NewsPageResponse> => {
	await requireContributor(event)
	setHeader(event, 'Cache-Control', 'private, no-store')

	const query = getQuery(event)
	const limit = validateIntegerParam(query.limit, 'limit', {
		min: 1,
		max: 100,
		defaultValue: 20,
	})
	const offset = validateIntegerParam(query.offset, 'offset', {
		min: 0,
		max: 100_000,
		defaultValue: 0,
	})
	const search = validateSearchParam(
		typeof query.search === 'string' ? query.search : undefined,
	)
	const requestedOrder = typeof query.orderBy === 'string' ? query.orderBy : undefined
	const orderBy = validateOrderBy(requestedOrder, NEWS_ORDER_COLUMNS, 'date')
	const orderDirection = validateOrderDirection(
		typeof query.orderDirection === 'string' ? query.orderDirection : undefined,
		'desc',
	)

	if (
		query.verified !== undefined &&
		query.verified !== 'true' &&
		query.verified !== 'false'
	) {
		throw createBadRequestError("Parameter 'verified' must be true or false")
	}

	const supabase = useServerSupabase()
	let newsQuery = supabase.from('news').select(
		`
			*,
			artists:news_artists_junction(artist:artists(*)),
			contributions:user_news_contributions(user:users(*))
		`,
		{ count: 'exact' },
	)

	if (search) newsQuery = newsQuery.ilike('message', `%${search}%`)
	if (typeof query.startDate === 'string')
		newsQuery = newsQuery.gte('date', query.startDate)
	if (typeof query.endDate === 'string') newsQuery = newsQuery.lte('date', query.endDate)
	if (query.verified !== undefined) {
		newsQuery = newsQuery.eq('verified', query.verified === 'true')
	}

	const { data, count, error } = await newsQuery
		.order(orderBy, { ascending: orderDirection === 'asc' })
		.range(offset, offset + limit - 1)

	if (error) throw handleSupabaseError(error, 'news.paginated')

	let news = ((data ?? []) as RawNews[]).map(({ artists, contributions, ...item }) => ({
		...item,
		artists: transformJunction(artists, 'artist'),
		user: contributions?.[0]?.user ?? undefined,
	}))

	if (requestedOrder === 'artist') {
		news = news.sort((left, right) => {
			const leftName = left.artists[0]?.name ?? ''
			const rightName = right.artists[0]?.name ?? ''
			const comparison = leftName.localeCompare(rightName)
			return orderDirection === 'asc' ? comparison : -comparison
		})
	}

	const total = count ?? 0
	return {
		news,
		total,
		page: Math.floor(offset / limit) + 1,
		limit,
		totalPages: Math.max(1, Math.ceil(total / limit)),
	}
})
