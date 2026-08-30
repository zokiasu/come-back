import { applyMusicNameExclusions } from '../../utils/queryFilters'
import type { SearchMusicResponse } from '~/types/api'
import type { Json } from '~/types/supabase'

const getThumbnailUrl = (value: Json | null): string | null => {
	if (!Array.isArray(value)) return null

	for (const thumbnail of value) {
		if (
			typeof thumbnail === 'object' &&
			thumbnail !== null &&
			!Array.isArray(thumbnail) &&
			typeof thumbnail.url === 'string'
		) {
			return thumbnail.url
		}
	}

	return null
}

export default defineEventHandler(async (event): Promise<SearchMusicResponse> => {
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
	if (!search || search.length < 2) return { musics: [], totalCount: 0 }

	const supabase = useServerSupabase()
	let musicQuery = supabase
		.from('musics')
		.select(
			`
				id,
				name,
				id_youtube_music,
				duration,
				thumbnails,
				date,
				artists:music_artists!inner(
					artist:artists!inner(id, name, image, verified)
				),
				releases:music_releases(
					release:releases(id, name, image, verified)
				)
			`,
			{ count: 'exact' },
		)
		.eq('verified', true)
		.not('id_youtube_music', 'is', null)
		.eq('artists.artist.verified', true)
		.ilike('name', `%${search}%`)

	musicQuery = applyMusicNameExclusions(musicQuery)
	const { data, count, error } = await musicQuery
		.order('date', { ascending: false })
		.limit(limit)

	if (error) throw handleSupabaseError(error, 'search.musics')

	return {
		musics: (data ?? []).map(({ artists, releases, thumbnails, ...music }) => ({
			...music,
			thumbnailUrl: getThumbnailUrl(thumbnails),
			artists: transformJunction(artists, 'artist'),
			releases: transformJunction(releases, 'release').filter(
				(release) => release.verified === true,
			),
		})),
		totalCount: count ?? 0,
	}
})
