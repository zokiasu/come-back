import type { TablesInsert } from '~/types/supabase'
import { assertCanSetVerified, validateBody } from '../../utils/validation'
import { createCompanyBodySchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
	const user = await requireContributor(event)

	const body = validateBody(await readBody(event), createCompanyBodySchema)
	assertCanSetVerified(user, body.data.verified)

	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('companies')
		.insert(body.data as TablesInsert<'companies'>)
		.select()
		.single()

	if (error) throw handleSupabaseError(error, 'companies.create')

	return data
})
