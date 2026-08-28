export default defineEventHandler(async (event) => {
	await requireContributor(event)
	const query = getQuery(event)
	const name = validateSearchParam(
		typeof query.name === 'string' ? query.name : undefined,
	)
	const excludeId = typeof query.excludeId === 'string' ? query.excludeId : undefined

	if (!name) throw createBadRequestError("Parameter 'name' is required")

	const supabase = useServerSupabase()
	let companyQuery = supabase.from('companies').select('id').eq('name', name).limit(1)
	if (excludeId) companyQuery = companyQuery.neq('id', excludeId)

	const { data, error } = await companyQuery
	if (error) throw handleSupabaseError(error, 'companies.check-name')

	return { exists: Boolean(data?.length) }
})
