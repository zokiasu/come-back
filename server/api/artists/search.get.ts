import { useServerSupabase } from '../../utils/supabase'
import { validateLimitParam, validateSearchParam } from '../../utils/validation'
import { checkRateLimit, RATE_LIMIT_PRESETS } from '../../utils/rateLimit'
import type { ArtistType } from '~/types'
import type { ArtistSearchResponse } from '~/types/api'

export default defineEventHandler(async (event): Promise<ArtistSearchResponse> => {
	checkRateLimit(event, RATE_LIMIT_PRESETS.search)

	const query = getQuery(event)
	const search = validateSearchParam(query.search as string | undefined)
	const limit = validateLimitParam(Number(query.limit), 10)
	const typeParam = typeof query.type === 'string' ? query.type.toUpperCase() : undefined
	const artistType =
		typeParam === 'GROUP' || typeParam === 'SOLO' ? (typeParam as ArtistType) : undefined
	const normalizedSearch = search?.trim().replace(/\s+/g, ' ') || ''

	if (!normalizedSearch || normalizedSearch.length < 2) {
		return { artists: [] }
	}

	const supabase = useServerSupabase()

	const { data: rpcData, error: rpcError } = await supabase.rpc(
		'search_artists_fulltext',
		{
			search_query: normalizedSearch,
			result_limit: limit,
			artist_type: artistType,
		},
	)

	if (rpcError) {
		console.warn('Artist search RPC failed, falling back to ILIKE:', rpcError.message)

		let fallbackQuery = supabase
			.from('artists')
			.select('*')
			.eq('verified', true)
			.ilike('name', `%${normalizedSearch}%`)
			.order('name', { ascending: true })
			.limit(limit)

		if (artistType) {
			fallbackQuery = fallbackQuery.eq('type', artistType)
		}

		const { data, error } = await fallbackQuery

		if (error) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed to search artists',
				message: error.message,
			})
		}

		setHeader(event, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=300')

		return {
			artists: data || [],
		}
	}

	setHeader(event, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=300')

	const matchingIds = (rpcData ?? [])
		.filter((artist) => artist.verified === true)
		.map(({ id }) => id)

	if (matchingIds.length === 0) return { artists: [] }

	const { data: artists, error: hydrateError } = await supabase
		.from('artists')
		.select('*')
		.in('id', matchingIds)

	if (hydrateError) throw handleSupabaseError(hydrateError, 'search.artists.hydrate')

	const order = new Map(matchingIds.map((id, index) => [id, index]))
	return {
		artists: (artists ?? []).sort(
			(left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
		),
	}
})
