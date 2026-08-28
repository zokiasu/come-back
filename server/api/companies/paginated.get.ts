import { validateIntegerParam } from '../../utils/validation'

const COMPANY_TYPES = [
	'LABEL',
	'PUBLISHER',
	'DISTRIBUTOR',
	'MANAGER',
	'AGENCY',
	'STUDIO',
	'OTHER',
] as const

const COMPANY_ORDER_COLUMNS = [
	'name',
	'type',
	'founded_year',
	'created_at',
	'updated_at',
	'verified',
] as const

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const page = validateIntegerParam(query.page, 'page', {
		min: 1,
		max: 10_000,
		defaultValue: 1,
	})
	const limit = validateIntegerParam(query.limit, 'limit', {
		min: 1,
		max: 100,
		defaultValue: 20,
	})
	const search = validateSearchParam(
		typeof query.search === 'string' ? query.search : undefined,
	)
	const type = typeof query.type === 'string' ? query.type : undefined
	const orderBy = validateOrderBy(
		typeof query.orderBy === 'string' ? query.orderBy : undefined,
		COMPANY_ORDER_COLUMNS,
		'name',
	)
	const orderDirection = validateOrderDirection(
		typeof query.orderDirection === 'string' ? query.orderDirection : undefined,
		'asc',
	)

	if (type && !COMPANY_TYPES.includes(type as (typeof COMPANY_TYPES)[number])) {
		throw createBadRequestError("Parameter 'type' is invalid")
	}

	const verifiedParam = query.verified
	if (
		verifiedParam !== undefined &&
		verifiedParam !== 'true' &&
		verifiedParam !== 'false'
	) {
		throw createBadRequestError("Parameter 'verified' must be true or false")
	}

	const includeUnverified = query.includeUnverified === 'true'
	if (query.includeUnverified !== undefined && query.includeUnverified !== 'true') {
		throw createBadRequestError("Parameter 'includeUnverified' must be true")
	}

	if (includeUnverified || verifiedParam === 'false') {
		await requireContributor(event)
		setHeader(event, 'Cache-Control', 'private, no-store')
	} else {
		setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
	}

	const offset = (page - 1) * limit
	const supabase = useServerSupabase()
	let companiesQuery = supabase.from('companies').select('*', { count: 'exact' })

	if (!includeUnverified) {
		companiesQuery = companiesQuery.eq('verified', verifiedParam !== 'false')
	}
	if (type) companiesQuery = companiesQuery.eq('type', type)
	if (search) companiesQuery = companiesQuery.ilike('name', `%${search}%`)

	const { data, count, error } = await companiesQuery
		.order(orderBy, { ascending: orderDirection === 'asc' })
		.range(offset, offset + limit - 1)

	if (error) throw handleSupabaseError(error, 'companies.paginated')

	const total = count ?? 0
	return {
		companies: data ?? [],
		total,
		page,
		limit,
		totalPages: Math.max(1, Math.ceil(total / limit)),
	}
})
