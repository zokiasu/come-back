import type { Tables } from '#server/types/api'
import { isError as isH3Error } from 'h3'

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
		// Keep these queries separate so the endpoint can reshape each relation
		// into the same flat payload the client composables already expect.
		// 1. Fetch the artist of base (verified only on this public endpoint)
		const { data: artist, error: artistError } = await supabase
			.from('artists')
			.select('*')
			.eq('id', artistId)
			.eq('verified', true)
			.single()

		if (artistError || !artist) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Artist not found',
			})
		}

		// 2. Fetch the groups (relations where the artist is a member) — verified only
		const { data: groups } = await supabase
			.from('artist_relations')
			.select('group:artists!artist_relations_group_id_fkey(*)')
			.eq('member_id', artistId)
			.eq('group.verified', true)

		// 3. Fetch the members (relations where the artist is the group) — verified only
		const { data: members } = await supabase
			.from('artist_relations')
			.select('member:artists!artist_relations_member_id_fkey(*)')
			.eq('group_id', artistId)
			.eq('member.verified', true)

		// 4. Fetch the releases — verified only
		const { data: releases } = await supabase
			.from('artist_releases')
			.select('release:releases(*)')
			.eq('artist_id', artistId)
			.eq('release.verified', true)

		// 5. Fetch the companies — verified only
		const { data: companies } = await supabase
			.from('artist_companies')
			.select('*, company:companies!inner(*)')
			.eq('artist_id', artistId)
			.eq('company.verified', true)

		// 6. Fetch the social links
		const { data: socialLinks } = await supabase
			.from('artist_social_links')
			.select('*')
			.eq('artist_id', artistId)

		// 7. Fetch the platform links
		const { data: platformLinks } = await supabase
			.from('artist_platform_links')
			.select('*')
			.eq('artist_id', artistId)

		// 8. Fetch 9 random musics with all required data
		let randomMusics: Tables<'musics'>[] = []
		try {
			// Prefer the RPC because it can sample server-side without loading the
			// full artist discography into this handler.
			const { data: rpcData } = await supabase.rpc('get_random_music_ids_by_artist', {
				artist_id_param: artistId,
				count_param: 9,
			})

			// If the RPC returns IDs, fetch the full data
			if (rpcData && rpcData.length > 0) {
				const musicIds = rpcData
					.map((m: { id?: string }) => m.id)
					.filter((id): id is string => Boolean(id))
				if (musicIds.length > 0) {
					const { data: fullMusicData } = await supabase
						.from('musics')
						.select('*')
						.in('id', musicIds)
						.eq('verified', true)
					randomMusics = (fullMusicData || []) as Tables<'musics'>[]
				}
			}
		} catch {
			// Fallback: keep the endpoint working even if the RPC is missing or fails.
			const { data: allMusics } = await supabase
				.from('music_artists')
				.select('music:musics(*)')
				.eq('artist_id', artistId)
				.eq('music.verified', true)
				.limit(50) // Limit for the performances

			if (allMusics && allMusics.length > 0) {
				const musicsList = transformJunction(allMusics, 'music')
				// Fisher-Yates shuffle
				for (let i = musicsList.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1))
					const current = musicsList[i]
					const random = musicsList[j]
					if (current && random) {
						musicsList[i] = random
						musicsList[j] = current
					}
				}
				randomMusics = musicsList.slice(0, 9)
			}
		}

		// Mirror the client composable shape so detail pages and API consumers
		// receive the same flattened relations.
		const fullArtist = {
			...artist,
			groups: transformJunction(groups, 'group'),
			members: transformJunction(members, 'member'),
			releases: transformJunction(releases, 'release'),
			companies: companies || [],
		}

		return {
			artist: fullArtist,
			social_links: socialLinks || [],
			platform_links: platformLinks || [],
			random_musics: randomMusics || [],
		}
	} catch (error) {
		// Preserve H3Errors (like 404) instead of remapping them
		if (isH3Error(error)) {
			throw error
		}
		console.error('Error fetching complete artist:', error)

		// Check if it's a Supabase error
		if (isPostgrestError(error)) {
			throw handleSupabaseError(error, 'artists.complete')
		}

		// Otherwise, it's an unexpected error
		throw createInternalError('Failed to fetch complete artist data', error)
	}
})
