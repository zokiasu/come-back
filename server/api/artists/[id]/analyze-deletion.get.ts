export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const artistId = validateRouteParam(event, 'id', 'Artist')

	const supabase = useServerSupabase()

	const { data, error } = await supabase.rpc('analyze_artist_deletion_impact', {
		artist_id_param: artistId,
	})

	if (error) throw handleSupabaseError(error, 'artists.analyze-deletion')

	return data
})
