import type { Database, TablesInsert } from '~/types/supabase'
import type { Artist } from '~/types'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseClientType = SupabaseClient<Database>

const logArtistCreateTrace = (step: string, details?: Record<string, unknown>) => {
	if (!import.meta.dev) return

	if (details) {
		console.warn(`[ArtistCreate][artistRelations] ${step}`, details)
		return
	}

	console.warn(`[ArtistCreate][artistRelations] ${step}`)
}

/**
 * Insère les liens sociaux pour un artiste
 */
export async function insertSocialLinks(
	supabase: SupabaseClientType,
	artistId: string,
	socialLinks: TablesInsert<'artist_social_links'>[],
): Promise<void> {
	if (!socialLinks?.length) {
		logArtistCreateTrace('insertSocialLinks skipped', { artistId, count: 0 })
		return
	}

	logArtistCreateTrace('insertSocialLinks start', {
		artistId,
		count: socialLinks.length,
	})

	const linksWithArtistId = socialLinks.map((link) => ({
		...link,
		artist_id: artistId,
	}))

	const { error } = await supabase.from('artist_social_links').insert(linksWithArtistId)

	if (error) {
		console.error('[ArtistCreate][artistRelations] insertSocialLinks failed', {
			artistId,
			count: socialLinks.length,
			error,
		})
		return
	}

	logArtistCreateTrace('insertSocialLinks success', {
		artistId,
		count: socialLinks.length,
	})
}

/**
 * Insère les liens de plateformes pour un artiste
 */
export async function insertPlatformLinks(
	supabase: SupabaseClientType,
	artistId: string,
	platformLinks: TablesInsert<'artist_platform_links'>[],
): Promise<void> {
	if (!platformLinks?.length) {
		logArtistCreateTrace('insertPlatformLinks skipped', { artistId, count: 0 })
		return
	}

	logArtistCreateTrace('insertPlatformLinks start', {
		artistId,
		count: platformLinks.length,
	})

	const linksWithArtistId = platformLinks.map((link) => ({
		...link,
		artist_id: artistId,
	}))

	const { error } = await supabase.from('artist_platform_links').insert(linksWithArtistId)

	if (error) {
		console.error('[ArtistCreate][artistRelations] insertPlatformLinks failed', {
			artistId,
			count: platformLinks.length,
			error,
		})
		return
	}

	logArtistCreateTrace('insertPlatformLinks success', {
		artistId,
		count: platformLinks.length,
	})
}

/**
 * Insère les relations avec les groupes (artiste comme membre)
 */
export async function insertGroupRelations(
	supabase: SupabaseClientType,
	artistId: string,
	groups: Artist[],
): Promise<void> {
	if (!groups?.length) {
		logArtistCreateTrace('insertGroupRelations skipped', { artistId, count: 0 })
		return
	}

	logArtistCreateTrace('insertGroupRelations start', {
		artistId,
		count: groups.length,
	})

	const relations: TablesInsert<'artist_relations'>[] = groups.map((group) => ({
		group_id: group.id,
		member_id: artistId,
		relation_type: 'MEMBER' as const,
	}))

	const { error } = await supabase.from('artist_relations').insert(relations)

	if (error) {
		console.error('[ArtistCreate][artistRelations] insertGroupRelations failed', {
			artistId,
			count: groups.length,
			error,
		})
		return
	}

	logArtistCreateTrace('insertGroupRelations success', {
		artistId,
		count: groups.length,
	})
}

/**
 * Insère les relations avec les membres (artiste comme groupe)
 */
export async function insertMemberRelations(
	supabase: SupabaseClientType,
	artistId: string,
	members: Artist[],
): Promise<void> {
	if (!members?.length) {
		logArtistCreateTrace('insertMemberRelations skipped', { artistId, count: 0 })
		return
	}

	logArtistCreateTrace('insertMemberRelations start', {
		artistId,
		count: members.length,
	})

	const relations: TablesInsert<'artist_relations'>[] = members.map((member) => ({
		group_id: artistId,
		member_id: member.id,
		relation_type: 'GROUP' as const,
	}))

	const { error } = await supabase.from('artist_relations').insert(relations)

	if (error) {
		console.error('[ArtistCreate][artistRelations] insertMemberRelations failed', {
			artistId,
			count: members.length,
			error,
		})
		return
	}

	logArtistCreateTrace('insertMemberRelations success', {
		artistId,
		count: members.length,
	})
}

/**
 * Insère les relations avec les compagnies
 */
export async function insertCompanyRelations(
	supabase: SupabaseClientType,
	artistId: string,
	companies: TablesInsert<'artist_companies'>[],
): Promise<void> {
	if (!companies?.length) {
		logArtistCreateTrace('insertCompanyRelations skipped', { artistId, count: 0 })
		return
	}

	logArtistCreateTrace('insertCompanyRelations start', {
		artistId,
		count: companies.length,
	})

	const relations = companies.map((company) => ({
		...company,
		artist_id: artistId,
	}))

	const { error } = await supabase.from('artist_companies').insert(relations)

	if (error) {
		console.error('[ArtistCreate][artistRelations] insertCompanyRelations failed', {
			artistId,
			count: companies.length,
			error,
		})
		return
	}

	logArtistCreateTrace('insertCompanyRelations success', {
		artistId,
		count: companies.length,
	})
}

/**
 * Supprime tous les liens sociaux d'un artiste
 */
export async function deleteSocialLinks(
	supabase: SupabaseClientType,
	artistId: string,
): Promise<void> {
	await supabase.from('artist_social_links').delete().eq('artist_id', artistId)
}

/**
 * Supprime tous les liens de plateformes d'un artiste
 */
export async function deletePlatformLinks(
	supabase: SupabaseClientType,
	artistId: string,
): Promise<void> {
	await supabase.from('artist_platform_links').delete().eq('artist_id', artistId)
}

/**
 * Supprime toutes les relations d'un artiste (groupes et membres)
 */
export async function deleteArtistRelations(
	supabase: SupabaseClientType,
	artistId: string,
): Promise<void> {
	await supabase
		.from('artist_relations')
		.delete()
		.or(`group_id.eq.${artistId},member_id.eq.${artistId}`)
}

/**
 * Supprime toutes les relations avec les compagnies d'un artiste
 */
export async function deleteCompanyRelations(
	supabase: SupabaseClientType,
	artistId: string,
): Promise<void> {
	await supabase.from('artist_companies').delete().eq('artist_id', artistId)
}

/**
 * Met à jour les liens sociaux (supprime et réinsère)
 */
export async function updateSocialLinks(
	supabase: SupabaseClientType,
	artistId: string,
	socialLinks: TablesInsert<'artist_social_links'>[],
): Promise<void> {
	await deleteSocialLinks(supabase, artistId)
	if (socialLinks.length > 0) {
		await insertSocialLinks(supabase, artistId, socialLinks)
	}
}

/**
 * Met à jour les liens de plateformes (supprime et réinsère)
 */
export async function updatePlatformLinks(
	supabase: SupabaseClientType,
	artistId: string,
	platformLinks: TablesInsert<'artist_platform_links'>[],
): Promise<void> {
	await deletePlatformLinks(supabase, artistId)
	if (platformLinks.length > 0) {
		await insertPlatformLinks(supabase, artistId, platformLinks)
	}
}
