import type {
	Release,
	QueryOptions,
	FilterOptions,
	ReleaseType,
	Artist,
	ReleaseWithRelations,
} from '~/types'
import type { Database, TablesInsert, TablesUpdate } from '~/types/supabase'

// Types pour les données jointes
interface ArtistJunction {
	artist: Artist
}

interface ReleaseWithArtistJunctions extends Omit<Release, 'artists'> {
	artists?: ArtistJunction[]
	artist_releases?: ArtistJunction[]
}

export function useSupabaseRelease() {
	const supabase = useSupabaseClient<Database>()
	const toast = useToast()
	const { requireAuthHeaders } = useApiAuthHeaders()
	const { runMutation } = useMutationTimeout()

	// Met à jour une release
	const updateRelease = async (
		id: string,
		updates: TablesUpdate<'releases'>,
		platformLinks?: TablesInsert<'release_platform_links'>[],
	): Promise<Release | null> => {
		try {
			const data = await runMutation(
				$fetch<Release>(`/api/releases/${id}`, {
					method: 'PATCH',
					headers: requireAuthHeaders(),
					body: {
						updates,
						platformLinks: platformLinks?.map(({ release_id: _r, ...link }) => link),
					},
				}),
				'Updating the release timed out. Please try again.',
			)
			return data
		} catch (error) {
			console.error('Erreur lors de la mise à jour de la release:', error)
			toast.add({
				title: 'Error while updating release',
				color: 'error',
			})
			return null
		}
	}

	const updateReleaseArtists = async (id: string, artistIds?: string[]) => {
		try {
			await runMutation(
				$fetch(`/api/releases/${id}`, {
					method: 'PATCH',
					headers: requireAuthHeaders(),
					body: { artistIds },
				}),
				'Linking artists to the release timed out. Please try again.',
			)
			return true
		} catch (error) {
			console.error('Erreur lors de la mise à jour des artistes:', error)
			toast.add({
				title: 'Error while updating artists',
				color: 'error',
			})
			return false
		}
	}

	// Supprime une release
	const deleteRelease = async (id: string) => {
		try {
			await runMutation(
				$fetch(`/api/releases/${id}`, {
					method: 'DELETE',
					headers: requireAuthHeaders(),
				}),
				'Deleting the release timed out. Please try again.',
			)
			return true
		} catch (error) {
			console.error('Erreur lors de la suppression de la release:', error)
			toast.add({
				title: 'Error while deleting release',
				color: 'error',
			})
			return false
		}
	}

	// Récupère toutes les releases
	const getAllReleases = async (options?: QueryOptions & FilterOptions) => {
		let query = supabase.from('releases').select('*')

		if (options?.search) {
			query = query.ilike('name', `%${options.search}%`)
		}

		if (options?.type) {
			query = query.eq('type', options.type as ReleaseType)
		}

		if (options?.startDate) {
			query = query.gte('date', options.startDate)
		}

		if (options?.endDate) {
			query = query.lte('date', options.endDate)
		}

		if (options?.verified !== undefined) {
			query = query.eq('verified', options.verified)
		}

		if (options?.orderBy) {
			query = query.order(options.orderBy, {
				ascending: options.orderDirection === 'asc',
			})
		} else {
			query = query.order('date', { ascending: false })
		}

		if (options?.limit) {
			query = query.limit(options.limit)
		}

		if (options?.offset) {
			query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
		}

		const { data, error } = await query

		if (error) {
			console.error('Erreur lors de la récupération des releases:', error)
			return []
		}

		return data as Release[]
	}

	// Récupère une release avec tous ses détails
	const getReleaseById = async (id: string) => {
		if (!id) return null

		try {
			// Récupérer la release
			const { data: release, error: releaseError } = await supabase
				.from('releases')
				.select('*')
				.eq('id', id)
				.single()

			if (releaseError) throw releaseError

			// Récupérer les artistes associés
			const { data: artists, error: artistsError } = await supabase
				.from('artist_releases')
				.select(
					`
          artist:artists(*)
        `,
				)
				.eq('release_id', id)

			if (artistsError) throw artistsError

			// Récupérer les musiques associées avec l'ordre de track_number
			const { data: musics, error: musicsError } = await supabase
				.from('music_releases')
				.select(
					`
          track_number,
          music:musics(*)
        `,
				)
				.eq('release_id', id)
				.order('track_number', { ascending: true })

			if (musicsError) throw musicsError

			// Récupérer les liens de plateformes
			const { data: platformLinks, error: platformLinksError } = await supabase
				.from('release_platform_links')
				.select('*')
				.eq('release_id', id)

			if (platformLinksError) throw platformLinksError

			return {
				...release,
				artists: artists?.map((a) => a.artist) || [],
				musics: musics?.map((m) => m.music) || [],
				platform_links: platformLinks || [],
			} as ReleaseWithRelations
		} catch (error) {
			console.error('Erreur lors de la récupération des données de la release:', error)
			return null
		}
	}

	// Récupère une release par son ID (version légère)
	const getReleaseByIdLight = async (id: string) => {
		const { data, error } = await supabase
			.from('releases')
			.select('*')
			.eq('id', id)
			.single()

		if (error) {
			console.error('Erreur lors de la récupération de la release:', error)
			return null
		}

		return data as Release
	}

	// Récupère les dernières releases ajoutées en temps réel
	const getRealtimeLatestReleasesAdded = async (
		limitNumber: number,
		callback: (releases: Release[]) => void,
	) => {
		const { data, error } = await supabase
			.from('releases')
			.select(
				`
				*,
				artist_releases!inner (
					artist:artists (
						id,
						name,
						image,
						type
					)
				)
			`,
			)
			.order('date', { ascending: false })
			.limit(limitNumber)

		if (error) {
			console.error('Erreur lors de la récupération des dernières releases:', error)
			return
		}

		// Transformer les données pour avoir un format plus simple à utiliser
		const transformedData = (data as ReleaseWithArtistJunctions[]).map((release) => ({
			...release,
			artists: release.artist_releases?.map((ar: ArtistJunction) => ar.artist) || [],
		})) as Release[]

		callback(transformedData)
	}

	// Récupère les releases d'un mois et d'une année spécifiques
	const getReleasesByMonthAndYear = async (month: number, year: number) => {
		try {
			// Créer les dates de début et de fin du mois
			const startDate = new Date(year, month, 1)
			const endDate = new Date(year, month + 1, 0)

			const { data, error } = await supabase
				.from('releases')
				.select(
					`
					*,
					artists:artist_releases(
						artist:artists(*)
					)
				`,
				)
				.gte('date', startDate.toISOString())
				.lte('date', endDate.toISOString())
				.order('date', { ascending: true })

			if (error) {
				console.error('Erreur lors de la récupération des releases du mois:', error)
				toast.add({
					title: 'Error while fetching monthly releases',
					color: 'error',
				})
				throw error
			}

			// Transformer les données pour avoir un format plus simple
			const formattedData = (data as ReleaseWithArtistJunctions[]).map((release) => ({
				...release,
				artists: release.artists?.map((ar: ArtistJunction) => ar.artist) || [],
			}))

			return formattedData as Release[]
		} catch (error) {
			console.error('Erreur lors de la récupération des releases du mois:', error)
			throw error
		}
	}

	const getPlatformLinksByReleaseId = async (id: string) => {
		const { data: platformLinks, error: platformLinksError } = await supabase
			.from('release_platform_links')
			.select('*')
			.eq('release_id', id)

		if (platformLinksError) throw platformLinksError

		return {
			platformLinks: platformLinks || [],
		}
	}

	// Récupère les suggestions de releases pour un artiste
	const getSuggestedReleases = async (
		artistId: string,
		currentReleaseId: string,
		limit: number = 5,
	) => {
		try {
			const { data, error } = await supabase
				.from('releases')
				.select(
					`
					*,
					artist_releases!inner (
						artist:artists (
							id,
							name,
							image
						)
					)
				`,
				)
				.neq('id', currentReleaseId) // Exclure la release actuelle
				.eq('artist_releases.artist_id', artistId)
				.order('date', { ascending: false })
				.limit(limit)

			if (error) {
				console.error('Erreur lors de la récupération des suggestions:', error)
				return []
			}

			// Transformer les données pour avoir un format plus simple
			const transformedData = (data as ReleaseWithArtistJunctions[]).map((release) => ({
				...release,
				artists: release.artist_releases?.map((ar: ArtistJunction) => ar.artist) || [],
			})) as Release[]

			return transformedData
		} catch (error) {
			console.error('Erreur lors de la récupération des suggestions:', error)
			return []
		}
	}

	// Récupère les releases par page avec pagination
	const getReleasesByPage = async (
		page: number,
		limit: number,
		options?: {
			search?: string
			type?: ReleaseType
			orderBy?: keyof Release
			orderDirection?: 'asc' | 'desc'
			verified?: boolean
			artistIds?: string[]
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

			if (options?.type) {
				params.type = options.type
			}

			if (options?.orderBy) {
				params.orderBy = options.orderBy
			}

			if (options?.orderDirection) {
				params.orderDirection = options.orderDirection
			}

			if (options?.artistIds && options.artistIds.length > 0) {
				params.artistIds = options.artistIds.join(',')
			}

			if (options?.verified !== undefined) {
				params.verified = String(options.verified)
			}

			// Appeler l'endpoint API optimisé
			const result = await $fetch('/api/releases/paginated', {
				params,
			})

			return result
		} catch (error) {
			console.error('Erreur lors de la récupération des releases:', error)
			throw error
		}
	}

	// Créer une release avec relations artistes
	const createReleaseWithDetails = async (
		releaseData: TablesInsert<'releases'>,
		artistIds: string[],
		platformLinks?: TablesInsert<'release_platform_links'>[],
	): Promise<Release | null> => {
		try {
			const release = await runMutation(
				$fetch<Release>('/api/releases', {
					method: 'POST',
					headers: requireAuthHeaders(),
					body: {
						release: releaseData,
						artistIds,
						platformLinks: platformLinks?.map(({ release_id: _r, ...link }) => link),
					},
				}),
				'Creating the release timed out. Please try again.',
			)
			return release
		} catch (error) {
			console.error('Erreur lors de la création de la release:', error)
			toast.add({
				title: 'Error while creating release',
				color: 'error',
			})
			return null
		}
	}

	return {
		updateRelease,
		updateReleaseArtists,
		deleteRelease,
		getAllReleases,
		getReleaseById,
		getReleaseByIdLight,
		getRealtimeLatestReleasesAdded,
		getReleasesByMonthAndYear,
		getSuggestedReleases,
		getReleasesByPage,
		createReleaseWithDetails,
		getPlatformLinksByReleaseId,
	}
}
