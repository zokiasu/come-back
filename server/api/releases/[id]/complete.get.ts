import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig()
	const supabase = createClient(
		config.public.supabase.url,
		config.supabase.serviceKey,
		{
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false,
			},
		}
	)

	const releaseId = getRouterParam(event, 'id')
	if (!releaseId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Release ID is required',
		})
	}

	try {
		// Récupérer le release complet avec toutes ses relations
		const { data: release, error: releaseError } = await supabase
			.from('releases')
			.select(`
				*,
				artists:release_artists(
					artist:artists(*)
				),
				musics:release_musics(
					music:musics(*)
				)
			`)
			.eq('id', releaseId)
			.single()

		if (releaseError) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Release not found',
			})
		}

		// Récupérer des releases suggérées (même artiste, excluant le release actuel)
		const artistIds = release.artists?.map((junction: any) => junction.artist.id) || []
		let suggestedReleases = []

		if (artistIds.length > 0) {
			const { data: suggestedJunctions } = await supabase
				.from('release_artists')
				.select(`
					release:releases(
						*,
						artists:release_artists(
							artist:artists(*)
						)
					)
				`)
				.in('artist_id', artistIds)
				.neq('release_id', releaseId)
				.limit(6)
				.order('release.date', { ascending: false })

			// Transformer les données suggérées
			suggestedReleases = (suggestedJunctions || []).map((junction: any) => {
				const suggestedRelease = junction.release
				return {
					...suggestedRelease,
					artists: suggestedRelease.artists?.map((artistJunction: any) => artistJunction.artist) || []
				}
			})
		}

		// Transformer les données pour correspondre au format attendu
		const transformedRelease = {
			...release,
			artists: release.artists?.map((junction: any) => junction.artist) || [],
			musics: release.musics?.map((junction: any) => junction.music) || []
		}

		return {
			release: transformedRelease,
			suggested_releases: suggestedReleases
		}
	} catch (error) {
		console.error('Error fetching complete release:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal server error',
		})
	}
})