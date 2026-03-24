import type { TablesUpdate } from '~/types/supabase'

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const relationId = validateRouteParam(event, 'id', 'Company-artist relation')
	const body = await readBody<{ updates: TablesUpdate<'artist_companies'> }>(event)

	if (!body?.updates) {
		throw createBadRequestError('Updates are required')
	}

	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('artist_companies')
		.update(body.updates)
		.eq('id', relationId)
		.select(`*, company:companies(*), artist:artists(id, name, image, type, verified)`)
		.single()

	if (error) throw handleSupabaseError(error, 'artist_companies.update')

	return data
})
