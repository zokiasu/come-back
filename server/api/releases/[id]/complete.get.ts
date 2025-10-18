import type { Tables } from '~/server/types/api'
import type { PostgrestError } from '@supabase/supabase-js'

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

				// Récupérer les données complètes des releases suggérées + leurs artistes en 2 requêtes au lieu de N+1
				const [releasesResult, artistsResult] = await Promise.all([
					supabase
						.from('releases')
						.select('*')
						.in('id', releaseIds)
						.order('date', { ascending: false }),
					supabase
						.from('artist_releases')
						.select('release_id, artist:artists(*)')
						.in('release_id', releaseIds),
				])

				// Créer un Map pour grouper les artistes par release_id
				const artistsByReleaseId = new Map<string, Tables<'artists'>[]>()
				for (const item of artistsResult.data || []) {
					if (!artistsByReleaseId.has(item.release_id)) {
						artistsByReleaseId.set(item.release_id, [])
					}
					artistsByReleaseId.get(item.release_id)!.push(item.artist as Tables<'artists'>)
				}

				// Assembler les releases avec leurs artistes
				for (const release of releasesResult.data || []) {
					suggestedReleases.push({
						...release,
						artists: artistsByReleaseId.get(release.id) || [],
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
		// Preserve H3Errors (like 404) instead of remapping them
		if (isH3Error(error)) {
			throw error
		}
		console.error('Error fetching complete release:', error)
		throw handleSupabaseError(error as PostgrestError, 'releases.complete')
	}
})
