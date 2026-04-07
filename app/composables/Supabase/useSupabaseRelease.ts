import type {
	Release,
	QueryOptions,
	FilterOptions,
	ReleaseType,
	Artist,
	ReleaseWithRelations,
} from '~/types'
import type { Database, TablesInsert, TablesUpdate } from '~/types/supabase'

// Types for the data jointes
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

	// Updates a release
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
			console.error('[useSupabaseRelease] updateRelease failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while updating release',
				description: extractErrorMessage(error),
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
			console.error('[useSupabaseRelease] updateReleaseArtists failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while updating artists',
				description: extractErrorMessage(error),
				color: 'error',
			})
			return false
		}
	}

	// Deletes a release
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
			console.error('[useSupabaseRelease] deleteRelease failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while deleting release',
				description: extractErrorMessage(error),
				color: 'error',
			})
			return false
		}
	}

	// Fetch all releases
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

	// Fetches a release with all details
	const getReleaseById = async (id: string) => {
		if (!id) return null

		try {
			// Fetch the release
			const { data: release, error: releaseError } = await supabase
				.from('releases')
				.select('*')
				.eq('id', id)
				.single()

			if (releaseError) throw releaseError

			// Fetch related artists
			const { data: artists, error: artistsError } = await supabase
				.from('artist_releases')
				.select(
					`
          artist:artists(*)
        `,
				)
				.eq('release_id', id)

			if (artistsError) throw artistsError

			// Fetch related musics ordered by track_number
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

			// Fetch the platform links
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

	// Fetches a release by ID (lightweight version)
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

	// Fetch the latest releases added in real time
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

		// Transform the data into a simpler format
		const transformedData = (data as ReleaseWithArtistJunctions[]).map((release) => ({
			...release,
			artists: release.artist_releases?.map((ar: ArtistJunction) => ar.artist) || [],
		})) as Release[]

		callback(transformedData)
	}

	// Fetches the releases of a month and of a year specific
	const getReleasesByMonthAndYear = async (month: number, year: number) => {
		try {
			// Create the start and end dates of the month
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

			// Transform data into a simpler format
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

	// Fetches the suggestions of releases for a artist
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
				.neq('id', currentReleaseId) // Exclure the release actuelle
				.eq('artist_releases.artist_id', artistId)
				.order('date', { ascending: false })
				.limit(limit)

			if (error) {
				console.error('Erreur lors de la récupération des suggestions:', error)
				return []
			}

			// Transform data into a simpler format
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

	// Fetches releases by page with pagination
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
			// Build the query params
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

			// Call the optimized API endpoint
			const result = await $fetch('/api/releases/paginated', {
				params,
			})

			return result
		} catch (error) {
			console.error('Erreur lors de la récupération des releases:', error)
			throw error
		}
	}

	// Create a release with relations artists
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
			console.error('[useSupabaseRelease] createReleaseWithDetails failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while creating release',
				description: extractErrorMessage(error),
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
