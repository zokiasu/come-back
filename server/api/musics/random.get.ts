import type { Tables } from '~/server/types/api'
import type { PostgrestError } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()
	const query = getQuery(event)
	const limit = parseInt(query.limit as string) || 4

	try {
		// 1. Utiliser un COUNT estimé pour éviter de scanner toute la table
		// Pour 15k-50k+ entrées, count: 'estimated' est beaucoup plus rapide
		const { count } = await supabase
			.from('musics')
			.select('*', { count: 'estimated', head: true })
			.not('id_youtube_music', 'is', null)

		if (!count || count === 0) {
			return []
		}

		// 2. Stratégie optimisée pour grandes bases de données
		// Augmenter le nombre d'échantillons pour mieux couvrir une grande base
		const samplesCount = Math.min(6, Math.ceil(limit / 2) + 1) // 2-6 échantillons
		const sampleSize = Math.ceil(limit / samplesCount) + 1

		// 3. Préparer toutes les requêtes en parallèle pour maximiser la performance
		const fetchPromises = []

		for (let i = 0; i < samplesCount; i++) {
			// Calculer un offset aléatoire stratégiquement espacé
			// Diviser la base en segments pour une meilleure couverture
			const segmentSize = Math.floor(count / samplesCount)
			const segmentStart = i * segmentSize
			const segmentEnd = (i + 1) * segmentSize
			const randomOffset =
				Math.floor(Math.random() * (segmentEnd - segmentStart - sampleSize)) +
				segmentStart

			// Créer la promesse de requête (pas encore exécutée)
			const fetchPromise = supabase
				.from('musics')
				.select(
					`
					*,
					artists:music_artists(
						artist:artists(*)
					),
					releases:music_releases(
						release:releases(*)
					)
				`,
				)
				.not('id_youtube_music', 'is', null)
				.range(randomOffset, randomOffset + sampleSize - 1)
				.order('date', { ascending: false })

			fetchPromises.push(fetchPromise)
		}

		// 4. Exécuter TOUTES les requêtes en PARALLÈLE pour maximiser la vitesse
		const results = await Promise.all(fetchPromises)
		const allMusics: any[] = []

		results.forEach(({ data, error }) => {
			if (error) {
				console.error('Error fetching random music segment:', error)
				throw handleSupabaseError(error, 'musics.random.segment')
			}
			if (data && data.length > 0) {
				allMusics.push(...data)
			}
		})

		// 4. Transformer les données
		const transformedData = allMusics.map((music) => ({
			...music,
			artists: transformJunction<Tables<'artists'>>(music.artists, 'artist'),
			releases: transformJunction<Tables<'releases'>>(music.releases, 'release'),
		}))

		// 5. Supprimer les doublons par ID
		const uniqueMusics = transformedData.filter(
			(music, index, self) => index === self.findIndex((m) => m.id === music.id),
		)

		// 6. Diversifier les artistes pour éviter plusieurs fois le même
		const diversifiedMusics: any[] = []
		const usedArtistIds = new Set<string>()

		// Fonction de mélange Fisher-Yates
		const shuffleArray = (array: any[]) => {
			const shuffled = [...array]
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1))
				;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
			}
			return shuffled
		}

		// Mélanger d'abord pour éviter un biais
		const shuffledMusics = shuffleArray(uniqueMusics)

		// Prendre les musiques en privilégiant la diversité d'artistes
		for (const music of shuffledMusics) {
			if (diversifiedMusics.length >= limit) break

			// Récupérer l'ID du premier artiste de la musique
			const artistId = music.artists?.[0]?.id

			// Si pas d'artiste ou artiste pas encore utilisé, on prend la musique
			if (!artistId || !usedArtistIds.has(artistId)) {
				diversifiedMusics.push(music)
				if (artistId) {
					usedArtistIds.add(artistId)
				}
			}
		}

		// Si on n'a pas assez de musiques (cas rare), compléter avec les restantes
		if (diversifiedMusics.length < limit) {
			for (const music of shuffledMusics) {
				if (diversifiedMusics.length >= limit) break
				if (!diversifiedMusics.find((m) => m.id === music.id)) {
					diversifiedMusics.push(music)
				}
			}
		}

		return diversifiedMusics
	} catch (error) {
		// Preserve H3Errors if already thrown
		if (isH3Error(error)) {
			throw error
		}
		console.error('Error fetching random musics:', error)
		throw handleSupabaseError(error as PostgrestError, 'musics.random')
	}
})
