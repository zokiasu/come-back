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
import {
	createArtistRecord,
	updateArtistRecord,
	analyzeArtistDeletionImpact,
	deleteArtistSafely,
	deleteArtistSimply,
	type CreateArtistParams,
	type UpdateArtistParams,
} from './helpers/artist'

export function useSupabaseArtist() {
	const supabase = useSupabaseClient<Database>()
	const toast = useToast()

	// Vérifie si un artiste existe avec l'ID YouTube Music
	const artistExistInSupabase = (idYoutubeMusic: string | null): Promise<boolean> => {
		return checkArtistExists(supabase, idYoutubeMusic)
	}

	// Crée un nouvel artiste
	const createArtist = async (
		data: TablesInsert<'artists'>,
		artistSocials: TablesInsert<'artist_social_links'>[],
		artistPlatforms: TablesInsert<'artist_platform_links'>[],
		artistGroups: Artist[],
		artistMembers: Artist[],
		artistCompanies?: TablesInsert<'artist_companies'>[],
	): Promise<Artist> => {
		const params: CreateArtistParams = {
			data,
			socialLinks: artistSocials,
			platformLinks: artistPlatforms,
			groups: artistGroups,
			members: artistMembers,
			companies: artistCompanies,
		}

		return createArtistRecord(supabase, params, (message) => {
			toast.add({ title: message, color: 'error' })
		})
	}

	// Met à jour un artiste
	const updateArtist = async (
		artistId: string,
		updates: TablesUpdate<'artists'>,
		socialLinks?: TablesInsert<'artist_social_links'>[],
		platformLinks?: TablesInsert<'artist_platform_links'>[],
		artistGroups?: Artist[],
		artistMembers?: Artist[],
		artistCompanies?: Omit<TablesInsert<'artist_companies'>, 'artist_id'>[],
	): Promise<Artist> => {
		const params: UpdateArtistParams = {
			artistId,
			updates,
			socialLinks,
			platformLinks,
			groups: artistGroups,
			members: artistMembers,
			companies: artistCompanies,
		}

		return updateArtistRecord(supabase, params)
	}

	// Analyse les impacts de la suppression d'un artiste
	const getArtistDeletionImpact = (id: string) => {
		return analyzeArtistDeletionImpact(supabase, id)
	}

	// Supprime un artiste de manière sécurisée
	const deleteArtist = async (id: string) => {
		return deleteArtistSafely(
			supabase,
			id,
			(message) => toast.add({ title: 'Artiste supprimé', description: message, color: 'success' }),
			(message) => toast.add({ title: 'Erreur de suppression', description: message, color: 'error' }),
		)
	}

	// Supprime un artiste de manière simple
	const deleteArtistSimple = async (id: string) => {
		return deleteArtistSimply(
			supabase,
			id,
			(message) => toast.add({ title: 'Artiste supprimé', description: message, color: 'success' }),
			(message) => toast.add({ title: 'Erreur de suppression', description: message, color: 'error' }),
		)
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
	}
}
