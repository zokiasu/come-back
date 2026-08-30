import { assertCanSetVerified, toJsonValue, validateBody } from '../../utils/validation'
import { createArtistBodySchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
	const user = await requireContributor(event)

	const body = validateBody(await readBody(event), createArtistBodySchema)
	assertCanSetVerified(user, body.data.verified)

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
		p_artist: toJsonValue(body.data),
		p_social_links: toJsonValue(body.socialLinks ?? []),
		p_platform_links: toJsonValue(body.platformLinks ?? []),
		p_group_ids: toJsonValue(body.groupIds ?? []),
		p_member_ids: toJsonValue(body.memberIds ?? []),
		p_companies: toJsonValue(body.companies ?? []),
	})

	if (error) throw handleSupabaseError(error, 'artists.create')

	return artist
})
