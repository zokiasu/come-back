import type { TablesUpdate } from '~/types/supabase'
import { assertCanSetVerified, validateBody } from '../../../utils/validation'
import { updateCompanyBodySchema } from '../../../utils/schemas'

export default defineEventHandler(async (event) => {
	const user = await requireContributor(event)

	const companyId = validateRouteParam(event, 'id', 'Company')
	const body = validateBody(await readBody(event), updateCompanyBodySchema)
	assertCanSetVerified(user, body.data.verified)

	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('companies')
		.update(body.data as TablesUpdate<'companies'>)
		.eq('id', companyId)
		.select()
		.single()

	if (error) throw handleSupabaseError(error, 'companies.update')

	return data
})
