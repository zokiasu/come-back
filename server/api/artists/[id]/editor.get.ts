import type { RawArtistData } from '../../../utils/transformers'

export default defineEventHandler(async (event) => {
	await requireContributor(event)
	setHeader(event, 'Cache-Control', 'private, no-store')

	const id = validateRouteParam(event, 'id', 'Artist')
	const supabase = useServerSupabase()
	const { data, error } = await supabase
		.from('artists')
		.select(
			`
				*,
				groups:artist_relations!artist_relations_member_id_fkey(
					group:artists!artist_relations_group_id_fkey(*)
				),
				members:artist_relations!artist_relations_group_id_fkey(
					member:artists!artist_relations_member_id_fkey(*)
				),
				releases:artist_releases(release:releases(*)),
				companies:artist_companies(*, company:companies(*)),
				social_links:artist_social_links(*),
				platform_links:artist_platform_links(*)
			`,
		)
		.eq('id', id)
		.single()

	if (error) {
		if (error.code === 'PGRST116') throw createNotFoundError('Artist')
		throw handleSupabaseError(error, 'artists.editor')
	}

	return transformArtistWithRelations(data as RawArtistData, {
		includeGroups: true,
		includeMembers: true,
		includeReleases: true,
		includeCompanies: true,
		includeSocialLinks: true,
		includePlatformLinks: true,
	})
})
