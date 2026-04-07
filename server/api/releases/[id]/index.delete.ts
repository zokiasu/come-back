import { isError as isH3Error } from 'h3'

export default defineEventHandler(async (event) => {
	// Verify admin authentication
	await requireAdmin(event)

	const supabase = useServerSupabase()
	const releaseId = getRouterParam(event, 'id')
	if (!releaseId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Release ID is required',
		})
	}

	try {
	// Check that the release exists
		const { data: release, error: fetchError } = await supabase
			.from('releases')
			.select('id')
			.eq('id', releaseId)
			.single()

		if (fetchError || !release) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Release not found',
			})
		}

		// Fetch the ids of musics linked to this release
		const { data: musicRelations } = await supabase
			.from('music_releases')
			.select('music_id')
			.eq('release_id', releaseId)

		const musicIds = musicRelations?.map((r) => r.music_id) || []

		// Track errors for reporting
		const deletionErrors: { table: string; error: string }[] = []

		// Delete artist relations
		const { error: artistRelError } = await supabase
			.from('artist_releases')
			.delete()
			.eq('release_id', releaseId)

		if (artistRelError) {
			console.error('Error deleting artist_releases:', artistRelError)
			deletionErrors.push({ table: 'artist_releases', error: artistRelError.message })
		}

		// Delete music relations
		const { error: musicRelError } = await supabase
			.from('music_releases')
			.delete()
			.eq('release_id', releaseId)

		if (musicRelError) {
			console.error('Error deleting music_releases:', musicRelError)
			deletionErrors.push({ table: 'music_releases', error: musicRelError.message })
		}

		// Delete platform links
		const { error: platformLinksError } = await supabase
			.from('release_platform_links')
			.delete()
			.eq('release_id', releaseId)

		if (platformLinksError) {
			console.error('Error deleting release_platform_links:', platformLinksError)
			deletionErrors.push({
				table: 'release_platform_links',
				error: platformLinksError.message,
			})
		}

		// Delete orphaned musics that are no longer linked to other releases
		if (musicIds.length > 0) {
			// Find musics that are still linked to other releases
			const { data: stillLinkedMusics } = await supabase
				.from('music_releases')
				.select('music_id')
				.in('music_id', musicIds)

			const stillLinkedMusicIds = new Set(stillLinkedMusics?.map((r) => r.music_id) || [])

			// Orphaned musics are no longer linked to any release
			const orphanMusicIds = musicIds.filter((id) => !stillLinkedMusicIds.has(id))

			if (orphanMusicIds.length > 0) {
				// Delete music_artists relations for orphaned musics
				const { error: musicArtistsError } = await supabase
					.from('music_artists')
					.delete()
					.in('music_id', orphanMusicIds)

				if (musicArtistsError) {
					console.error('Error deleting music_artists:', musicArtistsError)
					deletionErrors.push({
						table: 'music_artists',
						error: musicArtistsError.message,
					})
				}

				// Delete orphaned musics
				const { error: deleteMusicsError } = await supabase
					.from('musics')
					.delete()
					.in('id', orphanMusicIds)

				if (deleteMusicsError) {
					console.error('Error deleting orphan musics:', deleteMusicsError)
					deletionErrors.push({ table: 'musics', error: deleteMusicsError.message })
				}
			}
		}

		// Delete the release
		const { error: deleteError } = await supabase
			.from('releases')
			.delete()
			.eq('id', releaseId)

		if (deleteError) {
			throw deleteError
		}

		// Return success while reporting any partial errors
		return {
			success: true,
			partialErrors: deletionErrors.length > 0 ? deletionErrors : undefined,
		}
	} catch (error) {
		if (isH3Error(error)) {
			throw error
		}
		console.error('Error deleting release:', error)
		if (isPostgrestError(error)) {
			throw handleSupabaseError(error, 'releases.delete')
		}
		throw createInternalError('Failed to delete release', error)
	}
})
