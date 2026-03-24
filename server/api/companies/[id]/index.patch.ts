import type { TablesUpdate } from '~/types/supabase'

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const companyId = validateRouteParam(event, 'id', 'Company')
	const body = await readBody<{ data: TablesUpdate<'companies'> }>(event)

	if (!body?.data) {
		throw createBadRequestError('Company data is required')
	}

	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('companies')
		.update(body.data)
		.eq('id', companyId)
		.select()
		.single()

	if (error) throw handleSupabaseError(error, 'companies.update')

	return data
})
