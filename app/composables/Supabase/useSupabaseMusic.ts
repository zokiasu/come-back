import type {
	QueryOptions,
	FilterOptions,
	MusicType,
	Music,
	Artist,
	Release,
} from '~/types'
import type { Database } from '~/types/supabase'

// Types pour les données jointes
interface ArtistJunction {
	artist: Artist
}

interface ReleaseJunction {
	release: Release
}

interface MusicWithRelations extends Omit<Music, 'artists' | 'releases'> {
	artists?: ArtistJunction[]
	releases?: ReleaseJunction[]
}

export function useSupabaseMusic() {
	const supabase = useSupabaseClient<Database>()
	const toast = useToast()

	// Met à jour une musique
	const updateMusic = async (
		id: string,
		updates: Partial<Database['public']['Tables']['musics']['Update']>,
	) => {
		const { data, error } = await supabase
			.from('musics')
			.update(updates)
			.eq('id', id)
			.select()
			.single()

		if (error) {
			console.error('Erreur lors de la mise à jour de la musique:', error)
			toast.add({
				title: 'Erreur lors de la mise à jour de la musique',
				color: 'error',
			})
			return null
		}

		return data as Music
	}

	const updateMusicArtists = async (id: string, artistIds?: string[]) => {
		try {
			// 1. Supprimer toutes les relations existantes
			const { error: deleteError } = await supabase
				.from('music_artists')
				.delete()
				.eq('music_id', id)

			if (deleteError) {
				console.error(
					'Erreur lors de la suppression des anciennes relations:',
					deleteError,
				)
				toast.add({
					title: 'Erreur lors de la mise à jour des artistes',
					color: 'error',
				})
				throw deleteError
			}

			// 2. Ajouter les nouvelles relations si nécessaire
			if (artistIds && artistIds.length > 0) {
				const { error: insertError } = await supabase.from('music_artists').insert(
					artistIds.map((artistId) => ({
						music_id: id,
						artist_id: artistId,
					})) as Database['public']['Tables']['music_artists']['Insert'][],
				)

				if (insertError) {
					console.error(
						'Erreur lors de la création des nouvelles relations:',
						insertError,
					)
					toast.add({
						title: 'Erreur lors de la mise à jour des artistes',
						color: 'error',
					})
					throw insertError
				}
			}
		} catch (error) {
			console.error('Erreur lors de la mise à jour des artistes:', error)
			return false
		}
	}

	const updateMusicReleases = async (id: string, releaseIds?: string[]) => {
		try {
			// 1. Supprimer toutes les relations existantes
			const { error: deleteError } = await supabase
				.from('music_releases')
				.delete()
				.eq('music_id', id)

			if (deleteError) {
				console.error(
					'Erreur lors de la suppression des anciennes relations:',
					deleteError,
				)
				toast.add({
					title: 'Erreur lors de la mise à jour des releases',
					color: 'error',
				})
				throw deleteError
			}

			// 2. Ajouter les nouvelles relations si nécessaire
			if (releaseIds && releaseIds.length > 0) {
				const { error: insertError } = await supabase.from('music_releases').insert(
					releaseIds.map((releaseId) => ({
						music_id: id,
						release_id: releaseId,
					})) as Database['public']['Tables']['music_releases']['Insert'][],
				)

				if (insertError) {
					console.error(
						'Erreur lors de la création des nouvelles relations:',
						insertError,
					)
					toast.add({
						title: 'Erreur lors de la mise à jour des releases',
						color: 'error',
					})
					throw insertError
				}
			}
		} catch (error) {
			console.error('Erreur lors de la mise à jour des releases:', error)
			return false
		}
	}

	// Supprime une musique
	const deleteMusic = async (id: string) => {
		// Supprimer d'abord les relations avec les artistes
		await supabase.from('music_artists').delete().eq('music_id', id)

		// Supprimer les relations avec les releases
		await supabase.from('music_releases').delete().eq('music_id', id)

		// Supprimer la musique
		const { error } = await supabase.from('musics').delete().eq('id', id)

		if (error) {
			console.error('Erreur lors de la suppression de la musique:', error)
			toast.add({
				title: 'Erreur lors de la suppression de la musique',
				color: 'error',
			})
			return false
		}

		return true
	}

	// Récupère toutes les musiques
	const getAllMusics = async (options?: QueryOptions & FilterOptions) => {
		let query = supabase.from('musics').select('*')

		if (options?.search) {
			query = query.ilike('name', `%${options.search}%`)
		}

		if (options?.type) {
			// Limitation : la colonne 'type' dans Supabase n'accepte que 'SONG'
			// Cast temporaire car MusicType ne contient pas 'SONG' dans le projet
			if (options.type === 'SONG') {
				query = query.eq('type', 'SONG')
			}
		}

		if (options?.verified !== undefined) {
			query = query.eq('verified', options.verified)
		}

		if (options?.orderBy) {
			query = query.order(options.orderBy, {
				ascending: options.orderDirection === 'asc',
			})
		} else {
			query = query.order('name')
		}

		if (options?.limit) {
			query = query.limit(options.limit)
		}

		if (options?.offset) {
			query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
		}

		const { data, error } = await query

		if (error) {
			console.error('Erreur lors de la récupération des musiques:', error)
			return []
		}

		return data as Music[]
	}

	// Récupère une musique avec tous ses détails
	const getMusicById = async (id: string) => {
		if (!id) return null

		try {
			// Récupérer la musique
			const { data: music, error: musicError } = await supabase
				.from('musics')
				.select('*')
				.eq('id', id)
				.single()

			if (musicError) throw musicError

			// Récupérer les artistes associés
			const { data: artists, error: artistsError } = await supabase
				.from('music_artists')
				.select(
					`
          artist:artists(*)
        `,
				)
				.eq('music_id', id)

			if (artistsError) throw artistsError

			// Récupérer les releases associées
			const { data: releases, error: releasesError } = await supabase
				.from('music_releases')
				.select(
					`
          release:releases(*)
        `,
				)
				.eq('music_id', id)

			if (releasesError) throw releasesError

			return {
				...((music || {}) as object),
				artists: (artists as ArtistJunction[])?.map((a) => a.artist) || [],
				releases: (releases as ReleaseJunction[])?.map((r) => r.release) || [],
			} as Music
		} catch (error) {
			console.error('Erreur lors de la récupération des données de la musique:', error)
			return null
		}
	}

	// Récupère une musique par son ID (version légère)
	const getMusicByIdLight = async (id: string) => {
		const { data, error } = await supabase
			.from('musics')
			.select('*')
			.eq('id', id)
			.single()

		if (error) {
			console.error('Erreur lors de la récupération de la musique:', error)
			return null
		}

		return data as Music
	}

	// Récupère les dernières musiques ajoutées en temps réel
	const getRealtimeLastestMusicsAdded = async (
		limitNumber: number,
		callback: (musics: Music[]) => void,
	) => {
		const { data, error } = await supabase
			.from('musics')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(limitNumber)

		if (error) {
			console.error('Erreur lors de la récupération des dernières musiques:', error)
			return
		}

		callback(data as Music[])
	}

	// Récupère un nombre aléatoire de musiques
	const getRandomMusics = async (count: number) => {
		try {
			// 1. Récupérer des IDs aléatoires avec une requête SQL brute
			const { data: randomMusics, error: randomError } = await supabase.rpc(
				'get_random_music_ids',
				{ count_param: count },
			)

			if (randomError) {
				console.error(
					'Erreur lors de la récupération des musiques aléatoires:',
					randomError,
				)
				return []
			}

			const randomIds = (randomMusics as { id: string }[]).map((m) => m.id)

			// 2. Récupérer les détails complets pour ces IDs spécifiques
			const { data: detailedMusics, error: detailsError } = await supabase
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
				.in('id', randomIds)

			if (detailsError) {
				console.error('Erreur lors de la récupération des détails:', detailsError)
				return []
			}

			// Transformer les données
			const formattedData = (detailedMusics as MusicWithRelations[]).map((music) => ({
				...music,
				artists: music.artists?.map((a: any) => a.artist) || [],
				releases: music.releases?.map((r: any) => r.release) || [],
			}))

			return formattedData
		} catch (error) {
			console.error('Erreur lors de la sélection aléatoire des musiques:', error)
			return []
		}
	}

	// Récupère un nombre aléatoire de musiques liées à un artiste
	const getRandomMusicsByArtistId = async (
		artistId: string,
		count: number,
	): Promise<Music[]> => {
		try {
			// 1. Récupérer des IDs aléatoires de musiques liées à l'artiste
			const { data: randomMusics, error: randomError } = await supabase.rpc(
				'get_random_music_ids_by_artist',
				{
					artist_id_param: artistId,
					count_param: count,
				},
			)

			if (randomError) {
				console.error(
					"Erreur lors de la récupération des musiques aléatoires de l'artiste:",
					randomError,
				)
				return []
			}

			const randomIds = (randomMusics as { id: string }[]).map((m) => m.id)

			// 2. Récupérer les détails complets pour ces IDs spécifiques
			const { data: detailedMusics, error: detailsError } = await supabase
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
				.in('id', randomIds)

			if (detailsError) {
				console.error('Erreur lors de la récupération des détails:', detailsError)
				return []
			}

			// Transformer les données
			const formattedData = (detailedMusics as MusicWithRelations[]).map((music) => ({
				...music,
				artists: music.artists?.map((a: any) => a.artist) || [],
				releases: music.releases?.map((r: any) => r.release) || [],
			}))

			return formattedData
		} catch (error) {
			console.error(
				"Erreur lors de la sélection aléatoire des musiques de l'artiste:",
				error,
			)
			return []
		}
	}

	// Créer une musique avec relations artistes
	const createMusic = async (
		musicData: Partial<Database['public']['Tables']['musics']['Insert']>,
		artistIds: string[],
	): Promise<Music | null> => {
		try {
			// 1. Créer la musique
			const { data: music, error: musicError } = await supabase
				.from('musics')
				.insert(musicData as Database['public']['Tables']['musics']['Insert'])
				.select()
				.single()

			if (musicError) {
				console.error('Erreur lors de la création de la musique:', musicError)
				toast.add({
					title: 'Erreur lors de la création de la musique',
					color: 'error',
				})
				throw musicError
			}

			// 2. Ajouter les relations avec les artistes
			if (artistIds && artistIds.length > 0) {
				const { error: artistError } = await supabase.from('music_artists').insert(
					artistIds.map((artistId, index) => ({
						music_id: music.id,
						artist_id: artistId,
						is_primary: index === 0, // Le premier artiste est considéré comme principal
					})) as Database['public']['Tables']['music_artists']['Insert'][],
				)

				if (artistError) {
					console.error("Erreur lors de l'ajout des artistes:", artistError)
					// On supprime la musique créée si l'ajout des artistes échoue
					await supabase.from('musics').delete().eq('id', music.id)
					toast.add({
						title: "Erreur lors de l'ajout des artistes",
						color: 'error',
					})
					throw artistError
				}
			}

			return music as Music
		} catch (error) {
			console.error('Erreur lors de la création de la musique:', error)
			return null
		}
	}

	// Ajouter une musique à une release
	const addMusicToRelease = async (
		musicId: string,
		releaseId: string,
		trackNumber: number,
	): Promise<boolean> => {
		try {
			const { error } = await supabase.from('music_releases').insert({
				music_id: musicId,
				release_id: releaseId,
				track_number: trackNumber,
			} as Database['public']['Tables']['music_releases']['Insert'])

			if (error) {
				console.error("Erreur lors de l'ajout de la musique à la release:", error)
				toast.add({
					title: "Erreur lors de l'ajout à la release",
					color: 'error',
				})
				throw error
			}

			return true
		} catch (error) {
			console.error("Erreur lors de l'ajout de la musique à la release:", error)
			return false
		}
	}

	// Retirer une musique d'une release
	const removeMusicFromRelease = async (
		musicId: string,
		releaseId: string,
	): Promise<boolean> => {
		try {
			const { error } = await supabase
				.from('music_releases')
				.delete()
				.eq('music_id', musicId)
				.eq('release_id', releaseId)

			if (error) {
				console.error('Erreur lors de la suppression de la musique de la release:', error)
				toast.add({
					title: 'Erreur lors de la suppression',
					color: 'error',
				})
				throw error
			}

			return true
		} catch (error) {
			console.error('Erreur lors de la suppression de la musique de la release:', error)
			return false
		}
	}

	// Récupère les musiques par page avec pagination et filtres avancés
	const getMusicsByPage = async (
		page: number,
		limit: number,
		options?: {
			search?: string
			artistName?: string
			artistId?: string
			artistIds?: string[]
			year?: number
			type?: MusicType
			verified?: boolean
			orderBy?: keyof Music
			orderDirection?: 'asc' | 'desc'
			ismv?: boolean
		},
	) => {
		try {
			// Construire les query params
			const params: Record<string, string> = {
				page: page.toString(),
				limit: limit.toString(),
			}

			if (options?.search) {
				params.search = options.search
			}

			if (options?.year !== undefined && options.year !== null) {
				params.year = options.year.toString()
			}

			if (options?.orderBy) {
				params.orderBy = options.orderBy
			}

			if (options?.orderDirection) {
				params.orderDirection = options.orderDirection
			}

			if (options?.ismv !== undefined) {
				params.ismv = options.ismv.toString()
			}

			// Support pour multi-artistes OU artiste unique
			if (options?.artistIds && options.artistIds.length > 0) {
				params.artistIds = options.artistIds.join(',')
			} else if (options?.artistId) {
				params.artistIds = options.artistId
			}

			// Appeler l'endpoint API optimisé
			const result = await $fetch('/api/musics/paginated', {
				params,
			})

			return result
		} catch (error) {
			console.error('Erreur lors de la récupération des musiques:', error)
			throw error
		}
	}

	// Récupère les derniers MV ajoutés
	const getLatestMVs = async (count: number = 7): Promise<Music[]> => {
		try {
			const { data, error } = await supabase
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
				.eq('ismv', true)
				.order('date', { ascending: false, nullsFirst: false })
				.order('created_at', { ascending: false })
				.limit(count)

			if (error) {
				console.error('Error loading latest MVs:', error)
				return []
			}

			// Transform the data to match the expected format
			const transformedData = (data as MusicWithRelations[]).map((music) => ({
				...music,
				artists: music.artists?.map((ma: any) => ma.artist) || [],
				releases: music.releases?.map((mr: any) => mr.release) || [],
			}))

			return transformedData as Music[]
		} catch (error) {
			console.error('Error fetching latest MVs:', error)
			return []
		}
	}

	return {
		updateMusic,
		updateMusicArtists,
		updateMusicReleases,
		deleteMusic,
		getAllMusics,
		getMusicById,
		getMusicByIdLight,
		getRealtimeLastestMusicsAdded,
		getRandomMusics,
		getRandomMusicsByArtistId,
		createMusic,
		addMusicToRelease,
		removeMusicFromRelease,
		getMusicsByPage,
		getLatestMVs,
	}
}
