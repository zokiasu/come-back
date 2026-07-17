import type { TablesInsert } from '~/types/supabase'
import { validateBody } from '../../../utils/validation'
import { linkArtistBodySchema } from '../../../utils/schemas'

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const companyId = validateRouteParam(event, 'id', 'Company')
	const body = validateBody(await readBody(event), linkArtistBodySchema)

	const supabase = useServerSupabase()

	const insertData: TablesInsert<'artist_companies'> = {
		company_id: companyId,
		artist_id: body.artistId,
		relationship_type: body.relationshipType ?? null,
		start_date: body.startDate ?? null,
		end_date: body.endDate ?? null,
		is_current: body.isCurrent ?? true,
	}

	const { data, error } = await supabase
		.from('artist_companies')
		.insert(insertData)
		.select(`*, company:companies(*), artist:artists(id, name, image, type, verified)`)
		.single()

	if (error) throw handleSupabaseError(error, 'artist_companies.insert')

	return data
})
