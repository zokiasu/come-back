import type { TablesInsert } from '~/types/supabase'

interface LinkArtistBody {
	artistId: string
	relationshipType?: string | null
	startDate?: string | null
	endDate?: string | null
	isCurrent?: boolean
}

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const companyId = validateRouteParam(event, 'id', 'Company')
	const body = await readBody<LinkArtistBody>(event)

	if (!body?.artistId) {
		throw createBadRequestError('Artist ID is required')
	}

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
