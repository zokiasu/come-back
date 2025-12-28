export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()

	// Vérifier que l'utilisateur est admin (optionnel mais recommandé)
	const query = getQuery(event)
	const dryRun = query.dryRun === 'true'

	try {
		// Récupérer toutes les musiques
		const { data: allMusics, error: musicsError } = await supabase
			.from('musics')
			.select('id, name')

		if (musicsError) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Erreur lors de la récupération des musiques',
			})
		}

		const totalMusics = allMusics?.length || 0

		// Récupérer toutes les relations music_releases
		const { data: musicReleases, error: relError } = await supabase
			.from('music_releases')
			.select('music_id')

		if (relError) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Erreur lors de la récupération des relations',
			})
		}

		// Créer un Set des music_id liées à des releases
		const linkedMusicIds = new Set(musicReleases?.map((r) => r.music_id) || [])

		// Trouver les musiques orphelines
		const orphanMusics = allMusics?.filter((m) => !linkedMusicIds.has(m.id)) || []

		if (orphanMusics.length === 0) {
			return {
				success: true,
				message: 'Aucune musique orpheline à supprimer',
				stats: {
					totalMusics,
					linkedMusics: linkedMusicIds.size,
					orphanMusics: 0,
					deleted: 0,
				},
			}
		}

		const orphanIds = orphanMusics.map((m) => m.id)

		if (dryRun) {
			return {
				success: true,
				dryRun: true,
				message: `${orphanMusics.length} musiques orphelines trouvées (dry run)`,
				stats: {
					totalMusics,
					linkedMusics: linkedMusicIds.size,
					orphanMusics: orphanMusics.length,
					deleted: 0,
				},
				orphanMusics: orphanMusics.slice(0, 20), // Limiter pour la preview
			}
		}

		// Supprimer les relations music_artists
		const { error: deleteArtistsError } = await supabase
			.from('music_artists')
			.delete()
			.in('music_id', orphanIds)

		if (deleteArtistsError) {
			console.error('Erreur suppression music_artists:', deleteArtistsError)
		}

		// Supprimer les musiques orphelines
		const { error: deleteMusicsError } = await supabase
			.from('musics')
			.delete()
			.in('id', orphanIds)

		if (deleteMusicsError) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Erreur lors de la suppression des musiques',
			})
		}

		return {
			success: true,
			message: `${orphanIds.length} musiques orphelines supprimées`,
			stats: {
				totalMusics,
				linkedMusics: linkedMusicIds.size,
				orphanMusics: orphanMusics.length,
				deleted: orphanIds.length,
			},
		}
	} catch (error) {
		if (isH3Error(error)) {
			throw error
		}
		console.error('Error cleaning up orphan musics:', error)
		throw createInternalError('Failed to cleanup orphan musics', error)
	}
})
