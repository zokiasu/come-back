import type { Json, TablesInsert } from '~/types/supabase'

interface CreateArtistBody {
	data: TablesInsert<'artists'>
	socialLinks: Omit<TablesInsert<'artist_social_links'>, 'artist_id'>[]
	platformLinks: Omit<TablesInsert<'artist_platform_links'>, 'artist_id'>[]
	groupIds: string[]
	memberIds: string[]
	companies?: Omit<TablesInsert<'artist_companies'>, 'artist_id'>[]
}

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const body = await readBody<CreateArtistBody>(event)

	if (!body?.data?.name) {
		throw createBadRequestError('Artist name is required')
	}

	// Bound relation arrays before handing them to the transactional RPC, to
	// avoid an oversized single transaction / long lock window.
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

	// Check duplicate YouTube Music ID
	if (body.data.id_youtube_music) {
		const { data: existing } = await supabase
			.from('artists')
			.select('id')
			.eq('id_youtube_music', body.data.id_youtube_music)
			.maybeSingle()

		if (existing) {
			throw createError({
				statusCode: 409,
				statusMessage: 'Conflict',
				message: 'An artist with this YouTube Music ID already exists',
			})
		}
	}

	// Atomic create: the artist and every relation are inserted in a single
	// transaction (RPC). If any relation fails, the whole thing rolls back and
	// the error surfaces — no more partially-created artists returned as 200.
	const { data: artist, error } = await supabase.rpc('create_artist_with_relations', {
		p_artist: body.data as unknown as Json,
		p_social_links: (body.socialLinks ?? []) as unknown as Json,
		p_platform_links: (body.platformLinks ?? []) as unknown as Json,
		p_group_ids: (body.groupIds ?? []) as unknown as Json,
		p_member_ids: (body.memberIds ?? []) as unknown as Json,
		p_companies: (body.companies ?? []) as unknown as Json,
	})

	if (error) throw handleSupabaseError(error, 'artists.create')

	return artist
})
