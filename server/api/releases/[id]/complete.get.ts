import type { Tables } from '~/server/types/api'

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
		// 1. Récupérer le release de base
		const { data: release, error: releaseError } = await supabase
			.from('releases')
			.select('*')
			.eq('id', releaseId)
			.single()

		if (releaseError || !release) {
			console.error('Error fetching release:', releaseError)
			throw createError({
				statusCode: 404,
				statusMessage: 'Release not found',
			})
		}

		// 2. Récupérer les artistes associés
		const { data: releaseArtists, error: artistsError } = await supabase
			.from('release_artists')
			.select('artist:artists(*)')
			.eq('release_id', releaseId)

		// Si release_artists ne fonctionne pas, essayer artist_releases
		let finalReleaseArtists = releaseArtists
		if (artistsError || !releaseArtists?.length) {
			const { data: altArtists } = await supabase
				.from('artist_releases')
				.select('artist:artists(*)')
				.eq('release_id', releaseId)
			finalReleaseArtists = altArtists
		}

		// 3. Récupérer les musiques associées
		const { data: releaseMusics, error: musicsError } = await supabase
			.from('release_musics')
			.select('music:musics(*)')
			.eq('release_id', releaseId)

		// Si release_musics ne fonctionne pas, essayer music_releases
		let finalReleaseMusics = releaseMusics
		if (musicsError || !releaseMusics?.length) {
			const { data: altMusics } = await supabase
				.from('music_releases')
				.select('music:musics(*)')
				.eq('release_id', releaseId)
			finalReleaseMusics = altMusics
		}

		// Récupérer des releases suggérées (même artiste, excluant le release actuel)
		const artistIds = transformJunction<Tables<'artists'>>(
			finalReleaseArtists,
			'artist',
		).map((artist) => artist.id)
		const suggestedReleases: Array<
			Tables<'releases'> & { artists: Tables<'artists'>[] }
		> = []

		if (artistIds.length > 0) {
			// Approche simplifiée : récupérer d'abord les IDs des releases suggérées
			const { data: suggestedIds } = await supabase
				.from('artist_releases')
				.select('release_id')
				.in('artist_id', artistIds)
				.neq('release_id', releaseId)
				.limit(6)

			if (suggestedIds && suggestedIds.length > 0) {
				const releaseIds = suggestedIds.map((item) => item.release_id)

				// Récupérer les données complètes des releases suggérées
				const { data: suggestedReleaseData } = await supabase
					.from('releases')
					.select('*')
					.in('id', releaseIds)
					.order('date', { ascending: false })

				// Pour chaque release suggérée, récupérer ses artistes
				for (const suggestedRelease of suggestedReleaseData || []) {
					const { data: suggestedArtists } = await supabase
						.from('artist_releases')
						.select('artist:artists(*)')
						.eq('release_id', suggestedRelease.id)

					suggestedReleases.push({
						...suggestedRelease,
						artists: transformJunction<Tables<'artists'>>(suggestedArtists, 'artist'),
					})
				}
			}
		}

		// Transformer les données pour correspondre au format attendu
		const transformedRelease = {
			...release,
			artists: transformJunction<Tables<'artists'>>(finalReleaseArtists, 'artist'),
			musics: transformJunction<Tables<'musics'>>(finalReleaseMusics, 'music'),
		}

		return {
			release: transformedRelease,
			suggested_releases: suggestedReleases,
		}
	} catch (error) {
		console.error('Error fetching complete release:', error)
		throw handleSupabaseError(error as any, 'releases.complete')
	}
})
