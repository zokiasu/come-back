export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const body = await readBody<{ artistId?: string; reason?: string }>(event)

	if (!body.artistId || body.artistId.trim() === '') {
		throw createBadRequestError('Artist ID is required')
	}

	const artistId = body.artistId.trim()
	const reason = body.reason?.trim() || null

	const supabase = useServerSupabase()

	// Fetch the artist to get their YouTube Music ID
	const { data: artist, error: artistError } = await supabase
		.from('artists')
		.select('id, name, id_youtube_music')
		.eq('id', artistId)
		.single()

	if (artistError) {
		throw handleSupabaseError(artistError, 'ban-artist.fetch')
	}

	if (!artist) {
		throw createNotFoundError('Artist', artistId)
	}

	if (!artist.id_youtube_music) {
		throw createBadRequestError('Cannot ban an artist without a YouTube Music ID')
	}

	// Insert into ignored_artists (not in generated types, use untyped cast)
	const supabaseUntyped = supabase as unknown as {
		from: (table: string) => ReturnType<typeof supabase.from>
	}

	const { error: insertError } = await supabaseUntyped
		.from('ignored_artists')
		.insert({ id_youtube_music: artist.id_youtube_music, reason })

	if (insertError) {
		throw handleSupabaseError(insertError, 'ban-artist.insert-ignored')
	}

	// Delete the artist and all connected elements via RPC
	const { error: deleteError } = await supabase.rpc('delete_artist_safely', {
		artist_id_param: artistId,
	})

	if (deleteError) {
		throw handleSupabaseError(deleteError, 'ban-artist.delete')
	}

	return {
		success: true,
		artistName: artist.name,
		id_youtube_music: artist.id_youtube_music,
	}
})
