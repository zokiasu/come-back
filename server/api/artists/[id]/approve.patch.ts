export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const artistId = validateRouteParam(event, 'id', 'Artist')

	const supabase = useServerSupabase()

	const { error } = await supabase
		.from('artists')
		.update({ verified: true })
		.eq('id', artistId)

	if (error) throw handleSupabaseError(error, 'artists.approve')

	return { success: true }
})
