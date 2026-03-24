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

	// Vérifie si un artiste existe avec l'ID YouTube Music
	const artistExistInSupabase = (idYoutubeMusic: string | null): Promise<boolean> => {
		return checkArtistExists(supabase, idYoutubeMusic)
	}

	// Crée un nouvel artiste
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
				elapsedMs: Date.now() - startedAt,
			})
			toast.add({ title: 'Error while creating artist', color: 'error' })
			throw error
		}
	}

	// Met à jour un artiste
	const updateArtist = async (
		artistId: string,
		updates: TablesUpdate<'artists'>,
		socialLinks?: Omit<TablesInsert<'artist_social_links'>, 'artist_id'>[],
		platformLinks?: Omit<TablesInsert<'artist_platform_links'>, 'artist_id'>[],
		artistGroups?: Artist[],
		artistMembers?: Artist[],
		artistCompanies?: Omit<TablesInsert<'artist_companies'>, 'artist_id'>[],
	): Promise<Artist> => {
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
	}

	// Analyse les impacts de la suppression d'un artiste
	const getArtistDeletionImpact = async (id: string) => {
		return $fetch(`/api/artists/${id}/analyze-deletion`, {
			headers: requireAuthHeaders(),
		})
	}

	// Supprime un artiste de manière sécurisée
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
			const msg = error instanceof Error ? error.message : 'An error occurred'
			console.error("Erreur lors de la suppression de l'artiste:", error)
			toast.add({ title: 'Deletion error', description: msg, color: 'error' })
			throw error
		}
	}

	// Supprime un artiste de manière simple
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
			const response = data as { success?: boolean; message?: string; artist_name?: string } | null
			toast.add({
				title: 'Artist deleted',
				description: response?.message || '',
				color: 'success',
			})
			return { success: response?.success, message: response?.message, artist_name: response?.artist_name }
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'An error occurred'
			console.error("Erreur lors de la suppression de l'artiste:", error)
			toast.add({ title: 'Deletion error', description: msg, color: 'error' })
			throw error
		}
	}

	// Fonction utilitaire pour choisir le mode de suppression
	const deleteArtistWithMode = async (id: string, mode: 'safe' | 'simple' = 'safe') => {
		if (mode === 'simple') {
			return await deleteArtistSimple(id)
		}
		return await deleteArtist(id)
	}

	// Récupère tous les artistes
	const getAllArtists = (options?: QueryOptions & FilterOptions) => {
		return fetchAllArtists(supabase, options)
	}

	// Récupère tous les artistes (version légère)
	const getAllArtistsLight = () => {
		return fetchAllArtistsLight(supabase)
	}

	// Récupère un artiste avec tous ses détails
	const getFullArtistById = (id: string): Promise<Artist> => {
		return fetchFullArtist(supabase, id)
	}

	// Récupère un artiste par son ID (version légère)
	const getArtistByIdLight = (id: string) => {
		return fetchArtistById(supabase, id)
	}

	// Récupère les liens sociaux et de plateformes d'un artiste
	const getSocialAndPlatformLinksByArtistId = (id: string) => {
		return fetchArtistLinks(supabase, id)
	}

	// Récupère les derniers artistes ajoutés
	const getRealtimeLatestArtistsAdded = async (
		limitNumber: number,
		callback: (artists: Artist[]) => void,
	) => {
		const artists = await fetchLatestArtists(supabase, limitNumber)
		callback(artists)
	}

	// Récupère les artistes par page avec pagination
	const getArtistsByPage = (page: number, limit: number, options?: ArtistPageOptions) => {
		return fetchArtistsByPage(supabase, page, limit, options)
	}

	// Approuve un artiste (met verified = true) sans toucher aux relations
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
			console.error("Erreur lors de l'approbation de l'artiste:", error)
			toast.add({
				title: 'Error',
				description: 'Unable to approve the artist',
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
