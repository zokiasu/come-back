export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const artistId = validateRouteParam(event, 'id', 'Artist')

	const supabase = useServerSupabase()

	const { error } = await supabase
		.from('user_followed_artists')
		.delete()
		.eq('user_id', user.id)
		.eq('artist_id', artistId)

	if (error) throw handleSupabaseError(error, 'user_followed_artists.delete')

	return { success: true }
})
