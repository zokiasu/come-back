import type { Database, TablesInsert } from '~/types/supabase'
import type { Artist } from '~/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useMutationTimeout } from '~/composables/useMutationTimeout'

type SupabaseClientType = SupabaseClient<Database>
const { runMutation } = useMutationTimeout()

const logArtistCreateTrace = (step: string, details?: Record<string, unknown>) => {
	if (!import.meta.dev) return

	if (details) {
		console.warn(`[ArtistCreate][artistRelations] ${step}`, details)
		return
	}

	console.warn(`[ArtistCreate][artistRelations] ${step}`)
}

/**
 * Inserts social links for an artist
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

	const { error } = await runMutation(
		supabase.from('artist_social_links').insert(linksWithArtistId),
		'Adding artist social links timed out. Please try again.',
	)

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
 * Inserts platform links for an artist
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

	const { error } = await runMutation(
		supabase.from('artist_platform_links').insert(linksWithArtistId),
		'Adding artist platform links timed out. Please try again.',
	)

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
 * Inserts group relations where the artist is a member
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

	const { error } = await runMutation(
		supabase.from('artist_relations').insert(relations),
		'Adding artist group relations timed out. Please try again.',
	)

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
 * Inserts member relations where the artist is the group
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

	const { error } = await runMutation(
		supabase.from('artist_relations').insert(relations),
		'Adding artist member relations timed out. Please try again.',
	)

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
 * Inserts company relations
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

	const { error } = await runMutation(
		supabase.from('artist_companies').insert(relations),
		'Adding artist company relations timed out. Please try again.',
	)

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
 * Deletes all social links for an artist
 */
export async function deleteSocialLinks(
	supabase: SupabaseClientType,
	artistId: string,
): Promise<void> {
	await runMutation(
		supabase.from('artist_social_links').delete().eq('artist_id', artistId),
		'Refreshing artist social links timed out. Please try again.',
	)
}

/**
 * Deletes all platform links for an artist
 */
export async function deletePlatformLinks(
	supabase: SupabaseClientType,
	artistId: string,
): Promise<void> {
	await runMutation(
		supabase.from('artist_platform_links').delete().eq('artist_id', artistId),
		'Refreshing artist platform links timed out. Please try again.',
	)
}

/**
 * Deletes all artist relations, including groups and members
 */
export async function deleteArtistRelations(
	supabase: SupabaseClientType,
	artistId: string,
): Promise<void> {
	await runMutation(
		supabase
			.from('artist_relations')
			.delete()
			.or(`group_id.eq.${artistId},member_id.eq.${artistId}`),
		'Refreshing artist relations timed out. Please try again.',
	)
}

/**
 * Deletes all company relations for an artist
 */
export async function deleteCompanyRelations(
	supabase: SupabaseClientType,
	artistId: string,
): Promise<void> {
	await runMutation(
		supabase.from('artist_companies').delete().eq('artist_id', artistId),
		'Refreshing artist company relations timed out. Please try again.',
	)
}

/**
 * Updates social links by deleting and reinserting them
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
 * Updates platform links by deleting and reinserting them
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
