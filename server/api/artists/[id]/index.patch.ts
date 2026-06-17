import type { Json, TablesInsert, TablesUpdate } from '~/types/supabase'

interface UpdateArtistBody {
	updates: TablesUpdate<'artists'>
	socialLinks?: Omit<TablesInsert<'artist_social_links'>, 'artist_id'>[]
	platformLinks?: Omit<TablesInsert<'artist_platform_links'>, 'artist_id'>[]
	groupIds?: string[]
	memberIds?: string[]
	companies?: Omit<TablesInsert<'artist_companies'>, 'artist_id'>[]
}

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const artistId = validateRouteParam(event, 'id', 'Artist')
	const body = await readBody<UpdateArtistBody>(event)

	if (!body) {
		throw createBadRequestError('Request body is required')
	}

	// Bound relation arrays before handing them to the transactional RPC.
	for (const [field, list] of Object.entries({
		socialLinks: body.socialLinks,
		platformLinks: body.platformLinks,
		groupIds: body.groupIds,
		memberIds: body.memberIds,
		companies: body.companies,
	})) {
		if (Array.isArray(list) && list.length > VALIDATION_LIMITS.MAX_ARRAY_ITEMS) {
			throw createBadRequestError(
				`'${field}' exceeds the maximum of ${VALIDATION_LIMITS.MAX_ARRAY_ITEMS} items`,
			)
		}
	}

	const supabase = useServerSupabase()

	// Check conflit YouTube Music ID
	if (body.updates?.id_youtube_music) {
		const { data: conflict } = await supabase
			.from('artists')
			.select('id, name')
			.eq('id_youtube_music', body.updates.id_youtube_music)
			.neq('id', artistId)
			.maybeSingle()

		if (conflict) {
			throw createError({
				statusCode: 409,
				statusMessage: 'Conflict',
				message: `This YouTube Music ID is already linked to ${conflict.name}`,
			})
		}
	}

	// Atomic update: the artist row and the provided relation sets are updated in
	// a single transaction (RPC). A SQL NULL means "leave this set untouched"; a
	// (possibly empty) array means "replace it". Either everything applies or the
	// whole change rolls back.
	const { data: updated, error } = await supabase.rpc('update_artist_with_relations', {
		p_artist_id: artistId,
		p_updates:
			body.updates && Object.keys(body.updates).length > 0
				? (body.updates as unknown as Json)
				: undefined,
		p_social_links: body.socialLinks as unknown as Json | undefined,
		p_platform_links: body.platformLinks as unknown as Json | undefined,
		p_group_ids: body.groupIds as unknown as Json | undefined,
		p_member_ids: body.memberIds as unknown as Json | undefined,
		p_companies: body.companies as unknown as Json | undefined,
	})

	if (error) throw handleSupabaseError(error, 'artists.update')
	if (!updated) throw createNotFoundError('Artist', artistId)

	return updated
})
