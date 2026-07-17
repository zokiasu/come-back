import type { Json } from '~/types/supabase'
import { assertCanSetVerified, validateBody } from '../../utils/validation'
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
