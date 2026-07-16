import type { TablesUpdate } from '~/types/supabase'
import { validateBody } from '../../../../utils/validation'
import { updateArtistCompanyBodySchema } from '../../../../utils/schemas'

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const relationId = validateRouteParam(event, 'id', 'Company-artist relation')
	const body = validateBody(await readBody(event), updateArtistCompanyBodySchema)

	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('artist_companies')
		.update(body.updates as TablesUpdate<'artist_companies'>)
		.eq('id', relationId)
		.select(`*, company:companies(*), artist:artists(id, name, image, type, verified)`)
		.single()

	if (error) throw handleSupabaseError(error, 'artist_companies.update')

	return data
})
