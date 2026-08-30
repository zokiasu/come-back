import type { SearchReleaseResponse } from '~/types/api'

export default defineEventHandler(async (event): Promise<SearchReleaseResponse> => {
	checkRateLimit(event, RATE_LIMIT_PRESETS.search)
	setHeader(event, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=300')

	const query = getQuery(event)
	const search = validateSearchParam(
		typeof query.search === 'string' ? query.search : undefined,
	)
	const limit = validateIntegerParam(query.limit, 'limit', {
		min: 1,
		max: 20,
		defaultValue: 8,
	})
	if (!search || search.length < 2) return { releases: [], totalCount: 0 }

	const supabase = useServerSupabase()
	const { data, count, error } = await supabase
		.from('releases')
		.select(
			`
				id,
				name,
				image,
				date,
				artists:artist_releases!inner(
					artist:artists!inner(id, name, image, verified)
				),
				musics:music_releases(
					music:musics(id, name, id_youtube_music, verified)
				)
			`,
			{ count: 'exact' },
		)
		.eq('verified', true)
		.eq('artists.artist.verified', true)
		.ilike('name', `%${search}%`)
		.order('date', { ascending: false })
		.limit(limit)

	if (error) throw handleSupabaseError(error, 'search.releases')

	return {
		releases: (data ?? []).map((release) => ({
			...release,
			artists: transformJunction(release.artists, 'artist'),
			musics: transformJunction(release.musics, 'music').filter(
				(music) => music.verified === true,
			),
		})),
		totalCount: count ?? 0,
	}
})
