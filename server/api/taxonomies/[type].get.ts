import type { H3Event } from 'h3'
import { validateIntegerParam } from '../../utils/validation'

type TaxonomyType = 'general-tags' | 'music-styles' | 'nationalities'

const getTaxonomyType = (event: H3Event): TaxonomyType => {
	const type = getRouterParam(event, 'type')
	if (type === 'general-tags' || type === 'music-styles' || type === 'nationalities') {
		return type
	}
	throw createNotFoundError('Taxonomy')
}

export default defineEventHandler(async (event) => {
	setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=300')

	const type = getTaxonomyType(event)
	const query = getQuery(event)
	const search = validateSearchParam(
		typeof query.search === 'string' ? query.search : undefined,
	)
	const limit = validateIntegerParam(query.limit, 'limit', {
		min: 1,
		max: 500,
		defaultValue: 500,
	})
	const offset = validateIntegerParam(query.offset, 'offset', {
		min: 0,
		max: 100_000,
		defaultValue: 0,
	})
	const descending = query.orderDirection === 'desc'
	if (
		query.orderDirection !== undefined &&
		query.orderDirection !== 'asc' &&
		query.orderDirection !== 'desc'
	) {
		throw createBadRequestError("Parameter 'orderDirection' must be asc or desc")
	}

	const supabase = useServerSupabase()
	const fetchGeneralTags = async () => {
		let taxonomyQuery = supabase.from('general_tags').select('*')
		if (search) taxonomyQuery = taxonomyQuery.ilike('name', `%${search}%`)
		return taxonomyQuery
			.order('name', { ascending: !descending })
			.range(offset, offset + limit - 1)
	}
	const fetchMusicStyles = async () => {
		let taxonomyQuery = supabase.from('music_styles').select('*')
		if (search) taxonomyQuery = taxonomyQuery.ilike('name', `%${search}%`)
		return taxonomyQuery
			.order('name', { ascending: !descending })
			.range(offset, offset + limit - 1)
	}
	const fetchNationalities = async () => {
		let taxonomyQuery = supabase.from('nationalities').select('*')
		if (search) taxonomyQuery = taxonomyQuery.ilike('name', `%${search}%`)
		return taxonomyQuery
			.order('name', { ascending: !descending })
			.range(offset, offset + limit - 1)
	}

	const result =
		type === 'general-tags'
			? await fetchGeneralTags()
			: type === 'music-styles'
				? await fetchMusicStyles()
				: await fetchNationalities()

	if (result.error) throw handleSupabaseError(result.error, `taxonomies.${type}.list`)
	return result.data ?? []
})
