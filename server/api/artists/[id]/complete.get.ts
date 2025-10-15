import type { Tables } from '~/server/types/api'

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()

	const artistId = getRouterParam(event, 'id')
	if (!artistId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Artist ID is required',
		})
	}

	try {
		// 1. Récupérer l'artiste de base
		const { data: artist, error: artistError } = await supabase
			.from('artists')
			.select('*')
			.eq('id', artistId)
			.single()

		if (artistError || !artist) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Artist not found',
			})
		}

		// 2. Récupérer les groupes (relations où l'artiste est membre)
		const { data: groups } = await supabase
			.from('artist_relations')
			.select('group:artists!artist_relations_group_id_fkey(*)')
			.eq('member_id', artistId)

		// 3. Récupérer les membres (relations où l'artiste est groupe)
		const { data: members } = await supabase
			.from('artist_relations')
			.select('member:artists!artist_relations_member_id_fkey(*)')
			.eq('group_id', artistId)

		// 4. Récupérer les releases
		const { data: releases } = await supabase
			.from('artist_releases')
			.select('release:releases(*)')
			.eq('artist_id', artistId)

		// 5. Récupérer les compagnies
		const { data: companies } = await supabase
			.from('artist_companies')
			.select('*, company:companies(*)')
			.eq('artist_id', artistId)

		// 6. Récupérer les liens sociaux
		const { data: socialLinks } = await supabase
			.from('artist_social_links')
			.select('*')
			.eq('artist_id', artistId)

		// 7. Récupérer les liens de plateformes
		const { data: platformLinks } = await supabase
			.from('artist_platform_links')
			.select('*')
			.eq('artist_id', artistId)

		// 8. Récupérer 9 musiques aléatoires avec toutes les données nécessaires
		let randomMusics: Tables<'musics'>[] = []
		try {
			// Essayer d'abord la fonction RPC
			const { data: rpcData } = await supabase.rpc('get_random_music_ids_by_artist', {
				artist_id_param: artistId,
				count_param: 9,
			})

			// Si la RPC retourne des IDs, récupérer les données complètes
			if (rpcData && rpcData.length > 0) {
				const musicIds = rpcData.map((m: { id?: string }) => m.id).filter(Boolean)
				if (musicIds.length > 0) {
					const { data: fullMusicData } = await supabase
						.from('musics')
						.select('*')
						.in('id', musicIds)
					randomMusics = (fullMusicData || []) as Tables<'musics'>[]
				}
			}
		} catch (rpcError) {
			// Fallback: récupérer les musiques de l'artiste et sélectionner aléatoirement
			const { data: allMusics } = await supabase
				.from('music_artists')
				.select('music:musics(*)')
				.eq('artist_id', artistId)
				.limit(50) // Limiter pour les performances

			if (allMusics && allMusics.length > 0) {
				const musicsList = transformJunction<Tables<'musics'>>(allMusics, 'music')
				// Mélange Fisher-Yates
				for (let i = musicsList.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1))
					;[musicsList[i], musicsList[j]] = [musicsList[j], musicsList[i]]
				}
				randomMusics = musicsList.slice(0, 9)
			}
		}

		// Construire l'artiste complet comme dans le composable
		const fullArtist = {
			...artist,
			groups: transformJunction<Tables<'artists'>>(groups, 'group'),
			members: transformJunction<Tables<'artists'>>(members, 'member'),
			releases: transformJunction<Tables<'releases'>>(releases, 'release'),
			companies: companies || [],
		}

		return {
			artist: fullArtist,
			social_links: socialLinks || [],
			platform_links: platformLinks || [],
			random_musics: randomMusics || [],
		}
	} catch (error) {
		console.error('Error fetching complete artist:', error)
		throw handleSupabaseError(error as any, 'artists.complete')
	}
})
