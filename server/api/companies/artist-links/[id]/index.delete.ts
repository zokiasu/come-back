export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const relationId = validateRouteParam(event, 'id', 'Company-artist relation')

	const supabase = useServerSupabase()

	const { error } = await supabase.from('artist_companies').delete().eq('id', relationId)

	if (error) throw handleSupabaseError(error, 'artist_companies.delete')

	return { success: true }
})
