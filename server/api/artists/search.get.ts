import { useServerSupabase } from '../../utils/supabase'
import { validateLimitParam, validateSearchParam } from '../../utils/validation'

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const search = validateSearchParam(query.search as string | undefined)
	const limit = validateLimitParam(Number(query.limit), 10)

	if (!search || search.length < 2) {
		return { artists: [] }
	}

	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('artists')
		.select('id, name, image, description, verified')
		.eq('verified', true)
		.ilike('name', `%${search}%`)
		.order('name', { ascending: true })
		.limit(limit)

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
})
