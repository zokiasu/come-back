import type { QueryOptions, FilterOptions, Artist } from '~/types'
import type { Database, TablesInsert, TablesUpdate } from '~/types/supabase'
import {
	checkArtistExists,
	fetchAllArtists,
	fetchAllArtistsLight,
	fetchArtistById,
	fetchFullArtist,
	fetchArtistLinks,
	fetchArtistsByPage,
	fetchLatestArtists,
	type ArtistPageOptions,
} from './helpers/artist'

const logArtistCreateTrace = (step: string, details?: Record<string, unknown>) => {
	if (!import.meta.dev) return

	if (details) {
		console.warn(`[ArtistCreate][useSupabaseArtist] ${step}`, details)
		return
	}

	console.warn(`[ArtistCreate][useSupabaseArtist] ${step}`)
}

export function useSupabaseArtist() {
	const supabase = useSupabaseClient<Database>()
	const toast = useToast()
	const { requireAuthHeaders } = useApiAuthHeaders()
	const { runMutation } = useMutationTimeout()

	// Checks whether an artist exists with the YouTube Music ID
	const artistExistInSupabase = (idYoutubeMusic: string | null): Promise<boolean> => {
		return checkArtistExists(supabase, idYoutubeMusic)
	}

	// Creates a nouvel artist
	const createArtist = async (
		data: TablesInsert<'artists'>,
		artistSocials: Omit<TablesInsert<'artist_social_links'>, 'artist_id'>[],
		artistPlatforms: Omit<TablesInsert<'artist_platform_links'>, 'artist_id'>[],
		artistGroups: Artist[],
		artistMembers: Artist[],
		artistCompanies?: Omit<TablesInsert<'artist_companies'>, 'artist_id'>[],
	): Promise<Artist> => {
		const startedAt = Date.now()
		logArtistCreateTrace('createArtist called', {
			name: data.name,
			type: data.type,
			hasYoutubeMusicId: Boolean(data.id_youtube_music),
			socialLinksCount: artistSocials.length,
			platformLinksCount: artistPlatforms.length,
			groupsCount: artistGroups.length,
			membersCount: artistMembers.length,
			companiesCount: artistCompanies?.length ?? 0,
		})

		try {
			const artist = await runMutation(
				$fetch<Artist>('/api/artists', {
					method: 'POST',
					headers: requireAuthHeaders(),
					body: {
						data,
						socialLinks: artistSocials,
						platformLinks: artistPlatforms,
						groupIds: artistGroups.map((g) => g.id),
						memberIds: artistMembers.map((m) => m.id),
						companies: artistCompanies,
					},
				}),
				'Creating the artist timed out. Please try again.',
			)

			logArtistCreateTrace('createArtist resolved', {
				artistId: artist.id,
				elapsedMs: Date.now() - startedAt,
			})

			return artist
		} catch (error) {
			console.error('[ArtistCreate][useSupabaseArtist] createArtist failed', {
				error,
				data: (error as { data?: unknown })?.data,
				elapsedMs: Date.now() - startedAt,
			})
			toast.add({
				title: 'Error while creating artist',
				description: extractErrorMessage(error),
				color: 'error',
			})
			throw error
		}
	}

	// Updates a artist
	const updateArtist = async (
		artistId: string,
		updates: TablesUpdate<'artists'>,
		socialLinks?: Omit<TablesInsert<'artist_social_links'>, 'artist_id'>[],
		platformLinks?: Omit<TablesInsert<'artist_platform_links'>, 'artist_id'>[],
		artistGroups?: Artist[],
		artistMembers?: Artist[],
		artistCompanies?: Omit<TablesInsert<'artist_companies'>, 'artist_id'>[],
	): Promise<Artist> => {
		try {
			const artist = await runMutation(
				$fetch<Artist>(`/api/artists/${artistId}`, {
					method: 'PATCH',
					headers: requireAuthHeaders(),
					body: {
						updates,
						socialLinks,
						platformLinks,
						groupIds: artistGroups?.map((g) => g.id),
						memberIds: artistMembers?.map((m) => m.id),
						companies: artistCompanies,
					},
				}),
				'Updating the artist timed out. Please try again.',
			)
			return artist
		} catch (error) {
			console.error('[useSupabaseArtist] updateArtist failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while updating artist',
				description: extractErrorMessage(error),
				color: 'error',
			})
			throw error
		}
	}

	// Analyse the impacts the suppression of a artist
	const getArtistDeletionImpact = async (id: string) => {
		return $fetch(`/api/artists/${id}/analyze-deletion`, {
			headers: requireAuthHeaders(),
		})
	}

	// Delete an artist with the safe flow
	const deleteArtist = async (id: string) => {
		try {
			const data = await runMutation(
				$fetch(`/api/artists/${id}`, {
					method: 'DELETE',
					headers: requireAuthHeaders(),
					query: { mode: 'safe' },
				}),
				'Deleting the artist timed out. Please try again.',
			)
			const response = data as { success?: boolean; message?: string } | null
			toast.add({
				title: 'Artist deleted',
				description: response?.message || '',
				color: 'success',
			})
			return { success: response?.success, message: response?.message }
		} catch (error) {
			console.error('[useSupabaseArtist] deleteArtist failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Deletion error',
				description: extractErrorMessage(error),
				color: 'error',
			})
			throw error
		}
	}

	// Delete an artist with the simple flow
	const deleteArtistSimple = async (id: string) => {
		try {
			const data = await runMutation(
				$fetch(`/api/artists/${id}`, {
					method: 'DELETE',
					headers: requireAuthHeaders(),
					query: { mode: 'simple' },
				}),
				'Deleting the artist timed out. Please try again.',
			)
			const response = data as {
				success?: boolean
				message?: string
				artist_name?: string
			} | null
			toast.add({
				title: 'Artist deleted',
				description: response?.message || '',
				color: 'success',
			})
			return {
				success: response?.success,
				message: response?.message,
				artist_name: response?.artist_name,
			}
		} catch (error) {
			console.error('[useSupabaseArtist] deleteArtistSimple failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Deletion error',
				description: extractErrorMessage(error),
				color: 'error',
			})
			throw error
		}
	}

	// Helper to choose the deletion mode
	const deleteArtistWithMode = async (id: string, mode: 'safe' | 'simple' = 'safe') => {
		if (mode === 'simple') {
			return await deleteArtistSimple(id)
		}
		return await deleteArtist(id)
	}

	// Fetch all artists
	const getAllArtists = (options?: QueryOptions & FilterOptions) => {
		return fetchAllArtists(supabase, options)
	}

	// Fetch all artists (lightweight version)
	const getAllArtistsLight = () => {
		return fetchAllArtistsLight(supabase)
	}

	// Fetches a artist with all details
	const getFullArtistById = (id: string): Promise<Artist> => {
		return fetchFullArtist(supabase, id)
	}

	// Fetches a artist by ID (lightweight version)
	const getArtistByIdLight = (id: string) => {
		return fetchArtistById(supabase, id)
	}

	// Fetches the social links and of platforms of a artist
	const getSocialAndPlatformLinksByArtistId = (id: string) => {
		return fetchArtistLinks(supabase, id)
	}

	// Fetches the latest added artists
	const getRealtimeLatestArtistsAdded = async (
		limitNumber: number,
		callback: (artists: Artist[]) => void,
	) => {
		const artists = await fetchLatestArtists(supabase, limitNumber)
		callback(artists)
	}

	// Fetches artists by page with pagination
	const getArtistsByPage = (page: number, limit: number, options?: ArtistPageOptions) => {
		return fetchArtistsByPage(supabase, page, limit, options)
	}

	// Approves an artist by setting `verified` to `true` without touching related records
	const approveArtist = async (artistId: string) => {
		try {
			await runMutation(
				$fetch(`/api/artists/${artistId}/approve`, {
					method: 'PATCH',
					headers: requireAuthHeaders(),
				}),
				'Approving the artist timed out. Please try again.',
			)
		} catch (error) {
			console.error('[useSupabaseArtist] approveArtist failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error',
				description: extractErrorMessage(error),
				color: 'error',
			})
			throw error
		}
	}

	return {
		artistExistInSupabase,
		createArtist,
		updateArtist,
		deleteArtist,
		deleteArtistSimple,
		deleteArtistWithMode,
		getArtistDeletionImpact,
		getAllArtists,
		getAllArtistsLight,
		getFullArtistById,
		getArtistByIdLight,
		getRealtimeLatestArtistsAdded,
		getSocialAndPlatformLinksByArtistId,
		getArtistsByPage,
		approveArtist,
	}
}
