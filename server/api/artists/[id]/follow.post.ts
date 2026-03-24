export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const artistId = validateRouteParam(event, 'id', 'Artist')

	const supabase = useServerSupabase()

	// Vérifier que l'artiste existe
	const { data: artist, error: artistError } = await supabase
		.from('artists')
		.select('id')
		.eq('id', artistId)
		.maybeSingle()

	if (artistError) throw handleSupabaseError(artistError, 'artists.exists')
	if (!artist) throw createNotFoundError('Artist', artistId)

	const { error } = await supabase
		.from('user_followed_artists')
		.upsert(
			{ user_id: user.id, artist_id: artistId },
			{ onConflict: 'user_id,artist_id', ignoreDuplicates: true },
		)

	if (error) throw handleSupabaseError(error, 'user_followed_artists.insert')

	return { success: true }
})
