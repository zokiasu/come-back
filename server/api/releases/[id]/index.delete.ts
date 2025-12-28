export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()

	const releaseId = getRouterParam(event, 'id')
	if (!releaseId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Release ID is required',
		})
	}

	try {
		// Vérifier que la release existe
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

		// Récupérer les IDs des musiques liées à cette release
		const { data: musicRelations } = await supabase
			.from('music_releases')
			.select('music_id')
			.eq('release_id', releaseId)

		const musicIds = musicRelations?.map((r) => r.music_id) || []

		// Supprimer les relations avec les artistes
		const { error: artistRelError } = await supabase
			.from('artist_releases')
			.delete()
			.eq('release_id', releaseId)

		if (artistRelError) {
			console.error('Error deleting artist_releases:', artistRelError)
		}

		// Supprimer les relations avec les musiques
		const { error: musicRelError } = await supabase
			.from('music_releases')
			.delete()
			.eq('release_id', releaseId)

		if (musicRelError) {
			console.error('Error deleting music_releases:', musicRelError)
		}

		// Supprimer les liens de plateforme
		const { error: platformLinksError } = await supabase
			.from('release_platform_links')
			.delete()
			.eq('release_id', releaseId)

		if (platformLinksError) {
			console.error('Error deleting release_platform_links:', platformLinksError)
		}

		// Supprimer les musiques orphelines (non liées à d'autres releases)
		if (musicIds.length > 0) {
			// Trouver les musiques encore liées à d'autres releases
			const { data: stillLinkedMusics } = await supabase
				.from('music_releases')
				.select('music_id')
				.in('music_id', musicIds)

			const stillLinkedMusicIds = new Set(stillLinkedMusics?.map((r) => r.music_id) || [])

			// Musiques orphelines = celles qui ne sont plus liées à aucune release
			const orphanMusicIds = musicIds.filter((id) => !stillLinkedMusicIds.has(id))

			if (orphanMusicIds.length > 0) {
				// Supprimer les relations music_artists des musiques orphelines
				await supabase
					.from('music_artists')
					.delete()
					.in('music_id', orphanMusicIds)

				// Supprimer les musiques orphelines
				const { error: deleteMusicsError } = await supabase
					.from('musics')
					.delete()
					.in('id', orphanMusicIds)

				if (deleteMusicsError) {
					console.error('Error deleting orphan musics:', deleteMusicsError)
				}
			}
		}

		// Supprimer la release
		const { error: deleteError } = await supabase
			.from('releases')
			.delete()
			.eq('id', releaseId)

		if (deleteError) {
			throw deleteError
		}

		return { success: true }
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
