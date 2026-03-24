export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const musicId = validateRouteParam(event, 'id', 'Music')
	const query = getQuery(event)
	const releaseId = query.releaseId as string

	if (!releaseId) {
		throw createBadRequestError('releaseId query parameter is required')
	}

	const supabase = useServerSupabase()

	const { error } = await supabase
		.from('music_releases')
		.delete()
		.eq('music_id', musicId)
		.eq('release_id', releaseId)

	if (error) throw handleSupabaseError(error, 'music_releases.delete')

	return { success: true }
})
