import type { PostgrestError } from '@supabase/supabase-js'
import { isError as isH3Error } from 'h3'

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()
	const query = getQuery(event)
	const limit = parseInt(query.limit as string) || 4

	try {
		// Stratégie optimisée: une seule requête simple avec offset aléatoire
		// Évite les jointures complexes qui causent des timeouts

		// 1. Obtenir un count estimé (très rapide)
		const { count } = await supabase
			.from('musics')
			.select('*', { count: 'estimated', head: true })
			.not('id_youtube_music', 'is', null)

		if (!count || count === 0) {
			return []
		}

		// 2. Générer un offset aléatoire
		const maxOffset = Math.max(0, count - limit * 3)
		const randomOffset = Math.floor(Math.random() * maxOffset)

		// 3. Une seule requête avec jointures légères (artistes et releases)
		const { data, error } = await supabase
			.from('musics')
			.select(
				`
				id,
				name,
				id_youtube_music,
				duration,
				thumbnails,
				type,
				date,
				artists:music_artists(
					artist:artists(id, name, image)
				),
				releases:music_releases(
					release:releases(id, name)
				)
			`,
			)
			.not('id_youtube_music', 'is', null)
			.range(randomOffset, randomOffset + limit * 3 - 1)
			.order('date', { ascending: false })

		if (error) {
			console.error('Error fetching random musics:', error)
			throw handleSupabaseError(error, 'musics.random')
		}

		if (!data || data.length === 0) {
			return []
		}

		// 4. Transformer les données
		const transformedData = data.map((music) => ({
			...music,
			artists: music.artists
				?.map((a: { artist: { id: string; name: string; image: string | null } | null }) => a.artist)
				.filter(Boolean) || [],
			releases: music.releases
				?.map((r: { release: { id: string; name: string } | null }) => r.release)
				.filter(Boolean) || [],
		}))

		// 5. Mélanger et diversifier par artiste
		const shuffleArray = <T>(array: T[]): T[] => {
			const shuffled = [...array]
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1))
				;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
			}
			return shuffled
		}

		const shuffled = shuffleArray(transformedData)
		const result: typeof transformedData = []
		const usedArtistIds = new Set<string>()

		// Privilégier la diversité d'artistes
		for (const music of shuffled) {
			if (result.length >= limit) break
			const artistId = music.artists?.[0]?.id
			if (!artistId || !usedArtistIds.has(artistId)) {
				result.push(music)
				if (artistId) usedArtistIds.add(artistId)
			}
		}

		// Compléter si nécessaire
		if (result.length < limit) {
			for (const music of shuffled) {
				if (result.length >= limit) break
				if (!result.find((m) => m.id === music.id)) {
					result.push(music)
				}
			}
		}

		return result
	} catch (error) {
		if (isH3Error(error)) {
			throw error
		}
		console.error('Error fetching random musics:', error)
		throw handleSupabaseError(error as PostgrestError, 'musics.random')
	}
})
