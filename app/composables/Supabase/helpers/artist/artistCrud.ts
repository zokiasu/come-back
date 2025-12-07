import type { Database, TablesInsert, TablesUpdate } from '~/types/supabase'
import type { Artist } from '~/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	ArtistDeletionAnalysis,
	ArtistDeletionResponse,
	ExclusiveContent,
} from '~/types/auth'
import {
	insertSocialLinks,
	insertPlatformLinks,
	insertGroupRelations,
	insertMemberRelations,
	insertCompanyRelations,
	updateSocialLinks,
	updatePlatformLinks,
	deleteArtistRelations,
	deleteCompanyRelations,
} from './artistRelations'
import { checkArtistExists } from './artistQueries'

type SupabaseClientType = SupabaseClient<Database>

export interface CreateArtistParams {
	data: TablesInsert<'artists'>
	socialLinks: TablesInsert<'artist_social_links'>[]
	platformLinks: TablesInsert<'artist_platform_links'>[]
	groups: Artist[]
	members: Artist[]
	companies?: TablesInsert<'artist_companies'>[]
}

export interface UpdateArtistParams {
	artistId: string
	updates: TablesUpdate<'artists'>
	socialLinks?: TablesInsert<'artist_social_links'>[]
	platformLinks?: TablesInsert<'artist_platform_links'>[]
	groups?: Artist[]
	members?: Artist[]
	companies?: Omit<TablesInsert<'artist_companies'>, 'artist_id'>[]
}

/**
 * Crée un nouvel artiste avec toutes ses relations
 */
export async function createArtistRecord(
	supabase: SupabaseClientType,
	params: CreateArtistParams,
	onError?: (message: string) => void,
): Promise<Artist> {
	const { data, socialLinks, platformLinks, groups, members, companies } = params

	// Vérifier si l'artiste existe déjà
	if (data.id_youtube_music && (await checkArtistExists(supabase, data.id_youtube_music))) {
		const message = 'Cet artiste existe déjà dans la base de données.'
		onError?.(message)
		throw new Error(message)
	}

	// Créer l'artiste
	const { data: artist, error } = await supabase
		.from('artists')
		.insert(data)
		.select()
		.single()

	if (error) {
		const message = "Erreur lors de la création de l'artiste"
		onError?.(message)
		console.error(message, error)
		throw new Error(message)
	}

	// Ajouter les relations en parallèle
	await Promise.all([
		insertSocialLinks(supabase, artist.id, socialLinks),
		insertPlatformLinks(supabase, artist.id, platformLinks),
		insertGroupRelations(supabase, artist.id, groups),
		insertMemberRelations(supabase, artist.id, members),
		companies?.length
			? insertCompanyRelations(
					supabase,
					artist.id,
					companies.map((c) => ({ ...c, artist_id: artist.id })),
				)
			: Promise.resolve(),
	])

	return artist as Artist
}

/**
 * Met à jour un artiste avec toutes ses relations
 */
export async function updateArtistRecord(
	supabase: SupabaseClientType,
	params: UpdateArtistParams,
): Promise<Artist> {
	const { artistId, updates, socialLinks, platformLinks, groups, members, companies } = params

	// Mettre à jour l'artiste
	const { data: artist, error } = await supabase
		.from('artists')
		.update(updates)
		.eq('id', artistId)
		.select()
		.single()

	if (error) {
		console.error("Erreur lors de la mise à jour de l'artiste:", error)
		throw new Error("Erreur lors de la mise à jour de l'artiste")
	}

	// Mettre à jour les liens si fournis
	if (socialLinks !== undefined) {
		await updateSocialLinks(supabase, artist.id, socialLinks)
	}

	if (platformLinks !== undefined) {
		await updatePlatformLinks(supabase, artist.id, platformLinks)
	}

	// Mettre à jour les relations artiste
	await deleteArtistRelations(supabase, artist.id)

	if (groups?.length) {
		await insertGroupRelations(supabase, artist.id, groups)
	}

	if (members?.length) {
		await insertMemberRelations(supabase, artist.id, members)
	}

	// Mettre à jour les compagnies
	await deleteCompanyRelations(supabase, artist.id)

	if (companies?.length) {
		await insertCompanyRelations(
			supabase,
			artist.id,
			companies.map((c) => ({ ...c, artist_id: artist.id })),
		)
	}

	return artist as Artist
}

/**
 * Analyse les impacts de la suppression d'un artiste
 */
export async function analyzeArtistDeletionImpact(supabase: SupabaseClientType, id: string) {
	const { data, error } = await supabase.rpc('analyze_artist_deletion_impact', {
		artist_id_param: id,
	})

	if (error) {
		console.error("Erreur lors de l'analyse d'impact:", error)
		throw new Error("Erreur lors de l'analyse d'impact")
	}

	const response = data as ExclusiveContent
	return {
		exclusiveReleases: response?.exclusive_releases || [],
		exclusiveMusics: response?.exclusive_musics || [],
		exclusiveNews: response?.exclusive_news || [],
	}
}

/**
 * Supprime un artiste de manière sécurisée (avec analyse d'impact)
 */
export async function deleteArtistSafely(
	supabase: SupabaseClientType,
	id: string,
	onSuccess?: (message: string) => void,
	onError?: (message: string) => void,
) {
	try {
		const { data, error } = await supabase.rpc('delete_artist_safely', {
			artist_id_param: id,
		})

		if (error) {
			throw new Error(error.message || "Erreur lors de la suppression de l'artiste")
		}

		const response = data as ArtistDeletionAnalysis
		onSuccess?.(response?.message || 'Artiste supprimé')

		return {
			success: response?.success,
			message: response?.message,
			details: response?.details,
			impact: response?.details?.impact_analysis,
		}
	} catch (error: any) {
		console.error("Erreur lors de la suppression de l'artiste:", error)
		onError?.(error.message || 'Une erreur est survenue lors de la suppression')
		throw error
	}
}

/**
 * Supprime un artiste de manière simple (sans analyse poussée)
 */
export async function deleteArtistSimply(
	supabase: SupabaseClientType,
	id: string,
	onSuccess?: (message: string) => void,
	onError?: (message: string) => void,
) {
	try {
		const { data, error } = await supabase.rpc('delete_artist_simple', {
			artist_id_param: id,
		})

		if (error) {
			throw new Error(error.message || "Erreur lors de la suppression de l'artiste")
		}

		const response = data as ArtistDeletionResponse
		onSuccess?.(response?.message || 'Artiste supprimé')

		return {
			success: response?.success,
			message: response?.message,
			artist_name: response?.artist_name,
		}
	} catch (error: any) {
		console.error("Erreur lors de la suppression de l'artiste:", error)
		onError?.(error.message || 'Une erreur est survenue lors de la suppression')
		throw error
	}
}
