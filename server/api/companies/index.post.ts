import type { TablesInsert } from '~/types/supabase'

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const body = await readBody<{ data: TablesInsert<'companies'> }>(event)

	if (!body?.data?.name) {
		throw createBadRequestError('Company name is required')
	}

	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('companies')
		.insert(body.data)
		.select()
		.single()

	if (error) throw handleSupabaseError(error, 'companies.create')

	return data
})
