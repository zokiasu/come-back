import type { Tables } from '~/server/types/api'

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()
	const query = getQuery(event)
	const limit = parseInt((query.limit as string) || '8', 10)

	const { data, error } = await supabase
		.from('releases')
		.select(
			`
			*,
			artists:artist_releases(
				artist:artists(*)
			)
		`,
		)
		.order('date', { ascending: false })
		.limit(limit)

	if (error) {
		throw handleSupabaseError(error, 'releases.latest')
	}

	// Transform the data to extract artists from junction table
	const transformedData = (data || []).map((release) => ({
		...release,
		artists: transformJunction<Tables<'artists'>>(release.artists, 'artist'),
	}))

	return transformedData
})
