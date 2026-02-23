export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const query = getQuery(event)
	const idYoutubeMusic = query.id as string | undefined

	if (!idYoutubeMusic || idYoutubeMusic.trim() === '') {
		throw createBadRequestError('YouTube Music ID is required')
	}

	const sanitizedId = idYoutubeMusic.trim()

	if (sanitizedId.length > VALIDATION_LIMITS.MAX_SEARCH_LENGTH) {
		throw createBadRequestError('YouTube Music ID exceeds maximum length')
	}

	const supabase = useServerSupabase()

	// ignored_artists is not in the generated Database types yet, so we cast to query it
	const supabaseUntyped = supabase as unknown as {
		from: (table: string) => ReturnType<typeof supabase.from>
	}

	const [artistResult, ignoredResult] = await Promise.all([
		supabase
			.from('artists')
			.select('id, name')
			.eq('id_youtube_music', sanitizedId)
			.maybeSingle(),
		supabaseUntyped
			.from('ignored_artists')
			.select('id, reason')
			.eq('id_youtube_music', sanitizedId)
			.maybeSingle(),
	])

	if (artistResult.error) {
		throw handleSupabaseError(artistResult.error, 'check-youtube-id.artists')
	}

	if (ignoredResult.error) {
		throw handleSupabaseError(ignoredResult.error, 'check-youtube-id.ignored_artists')
	}

	const ignoredData = ignoredResult.data as { id: string; reason: string | null } | null
	const artistData = artistResult.data

	if (ignoredData) {
		return {
			status: 'blacklisted' as const,
			reason: ignoredData.reason || null,
		}
	}

	if (artistData) {
		return {
			status: 'exists' as const,
			artistName: artistData.name,
		}
	}

	return {
		status: 'available' as const,
	}
})
