import type { TablesInsert } from '~/types/supabase'

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

	// 1. Create the artist
	const { data: artist, error: artistError } = await supabase
		.from('artists')
		.insert(body.data)
		.select()
		.single()

	if (artistError) throw handleSupabaseError(artistError, 'artists.create')

	const artistId = artist.id

	// 2. Insert social links
	if (body.socialLinks?.length) {
		const { error } = await supabase
			.from('artist_social_links')
			.insert(body.socialLinks.map((l) => ({ ...l, artist_id: artistId })))

		if (error) console.error('Error inserting social links:', error)
	}

	// 3. Insert platform links
	if (body.platformLinks?.length) {
		const { error } = await supabase
			.from('artist_platform_links')
			.insert(body.platformLinks.map((l) => ({ ...l, artist_id: artistId })))

		if (error) console.error('Error inserting platform links:', error)
	}

	// 4. Insert group relations where the artist is a member of those groups
	if (body.groupIds?.length) {
		const { error } = await supabase.from('artist_relations').insert(
			body.groupIds.map((groupId) => ({
				group_id: groupId,
				member_id: artistId,
				relation_type: 'MEMBER' as const,
			})),
		)

		if (error) console.error('Error inserting group relations:', error)
	}

	// 5. Insert member relations where the artist is the group
	if (body.memberIds?.length) {
		const { error } = await supabase.from('artist_relations').insert(
			body.memberIds.map((memberId) => ({
				group_id: artistId,
				member_id: memberId,
				relation_type: 'GROUP' as const,
			})),
		)

		if (error) console.error('Error inserting member relations:', error)
	}

	// 6. Insert companies
	if (body.companies?.length) {
		const { error } = await supabase
			.from('artist_companies')
			.insert(body.companies.map((c) => ({ ...c, artist_id: artistId })))

		if (error) console.error('Error inserting company relations:', error)
	}

	return artist
})
