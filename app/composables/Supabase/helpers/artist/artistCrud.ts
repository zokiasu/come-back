import type { Database, TablesInsert, TablesUpdate } from '~/types/supabase'
import type { Artist } from '~/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useMutationTimeout } from '~/composables/useMutationTimeout'
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
const { runMutation } = useMutationTimeout()

const logArtistCreateTrace = (step: string, details?: Record<string, unknown>) => {
	if (!import.meta.dev) return

	if (details) {
		console.warn(`[ArtistCreate][artistCrud] ${step}`, details)
		return
	}

	console.warn(`[ArtistCreate][artistCrud] ${step}`)
}

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
 * Creates a new artist with all related records
 */
export async function createArtistRecord(
	supabase: SupabaseClientType,
	params: CreateArtistParams,
	onError?: (message: string) => void,
): Promise<Artist> {
	const { data, socialLinks, platformLinks, groups, members, companies } = params
	const startedAt = Date.now()

	logArtistCreateTrace('createArtistRecord start', {
		name: data.name,
		type: data.type,
		hasYoutubeMusicId: Boolean(data.id_youtube_music),
		socialLinksCount: socialLinks.length,
		platformLinksCount: platformLinks.length,
		groupsCount: groups.length,
		membersCount: members.length,
		companiesCount: companies?.length ?? 0,
	})

	// Check whether the artist already exists
	if (data.id_youtube_music) {
		logArtistCreateTrace('checking duplicate YouTube Music ID', {
			idYoutubeMusic: data.id_youtube_music,
		})

		if (await checkArtistExists(supabase, data.id_youtube_music)) {
			const message = 'Cet artiste existe déjà dans la base de données.'
			onError?.(message)
			console.error('[ArtistCreate][artistCrud] duplicate artist detected', {
				idYoutubeMusic: data.id_youtube_music,
			})
			throw new Error(message)
		}

		logArtistCreateTrace('duplicate check completed', {
			idYoutubeMusic: data.id_youtube_music,
		})
	}

	// Create the artist
	logArtistCreateTrace('inserting artist row')
	const { data: artist, error } = await runMutation(
		supabase.from('artists').insert(data).select().single(),
		'Creating the artist timed out. Please try again.',
	)

	if (error) {
		const message = "Erreur lors de la création de l'artiste"
		onError?.(message)
		console.error('[ArtistCreate][artistCrud] artist insert failed', {
			error,
			elapsedMs: Date.now() - startedAt,
		})
		throw new Error(message)
	}

	logArtistCreateTrace('artist row inserted', {
		artistId: artist.id,
		elapsedMs: Date.now() - startedAt,
	})

	// Add relations in parallel
	logArtistCreateTrace('starting relation inserts', {
		artistId: artist.id,
		socialLinksCount: socialLinks.length,
		platformLinksCount: platformLinks.length,
		groupsCount: groups.length,
		membersCount: members.length,
		companiesCount: companies?.length ?? 0,
	})

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

	logArtistCreateTrace('relation inserts completed', {
		artistId: artist.id,
		elapsedMs: Date.now() - startedAt,
	})

	logArtistCreateTrace('createArtistRecord success', {
		artistId: artist.id,
		totalElapsedMs: Date.now() - startedAt,
	})

	return artist as Artist
}

/**
 * Updates an artist with all related records
 */
export async function updateArtistRecord(
	supabase: SupabaseClientType,
	params: UpdateArtistParams,
): Promise<Artist> {
	const { artistId, updates, socialLinks, platformLinks, groups, members, companies } =
		params

	if (updates.id_youtube_music) {
		const { data: conflictingArtist, error: conflictError } = await supabase
			.from('artists')
			.select('id, name')
			.eq('id_youtube_music', updates.id_youtube_music)
			.neq('id', artistId)
			.maybeSingle()

		if (conflictError) {
			console.error(
				"Erreur lors de la vérification d'un conflit d'ID YouTube Music:",
				conflictError,
			)
			throw new Error("Erreur lors de la vérification de l'ID YouTube Music")
		}

		if (conflictingArtist) {
			throw new Error(
				`This YouTube Music ID is already linked to ${conflictingArtist.name}.`,
			)
		}
	}

	// Update the artist
	const { data: artist, error } = await runMutation(
		supabase.from('artists').update(updates).eq('id', artistId).select().single(),
		'Updating the artist timed out. Please try again.',
	)

	if (error) {
		console.error("Erreur lors de la mise à jour de l'artiste:", error)

		if ('code' in error && error.code === '23505') {
			throw new Error('This artist conflicts with an existing unique value.')
		}

		throw new Error("Erreur lors de la mise à jour de l'artiste")
	}

	// Update links when provided
	if (socialLinks !== undefined) {
		await updateSocialLinks(supabase, artist.id, socialLinks)
	}

	if (platformLinks !== undefined) {
		await updatePlatformLinks(supabase, artist.id, platformLinks)
	}

	// Update the relations artist
	await deleteArtistRelations(supabase, artist.id)

	if (groups?.length) {
		await insertGroupRelations(supabase, artist.id, groups)
	}

	if (members?.length) {
		await insertMemberRelations(supabase, artist.id, members)
	}

	// Update the companies
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
