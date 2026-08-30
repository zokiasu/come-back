import { validateIntegerParam } from '../../utils/validation'

export default defineEventHandler(async (event) => {
	checkRateLimit(event, RATE_LIMIT_PRESETS.paginated)
	setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=60')

	const query = getQuery(event)
	const search = validateSearchParam(
		typeof query.search === 'string' ? query.search : undefined,
	)
	const page = validateIntegerParam(query.page, 'page', {
		min: 1,
		max: 10_000,
		defaultValue: 1,
	})
	const limit = validateIntegerParam(query.limit, 'limit', {
		min: 1,
		max: 50,
		defaultValue: 18,
	})
	const offset = (page - 1) * limit
	const supabase = useServerSupabase()
	let galleryQuery = supabase
		.from('artists')
		.select('id, name, image, description')
		.eq('verified', true)
		.not('image', 'is', null)
		.neq('image', '')

	if (search) galleryQuery = galleryQuery.ilike('name', `%${search}%`)

	const { data, error } = await galleryQuery
		.order('name', { ascending: true })
		.range(offset, offset + limit - 1)

	if (error) throw handleSupabaseError(error, 'artists.photo-gallery')
	return data ?? []
})
