import { createBadRequestError, handleSupabaseError } from '../../../utils/errorHandler'
import {
	MV_MATCHER_MUSIC_SELECT,
	clampInteger,
	scoreMusicMatch,
	toMatchMusicRecord,
	type MatchMusicRecord,
	type MatchSuggestion,
	type RawMatchMusicRow,
} from '../../../utils/youtubeMvMatcher'

const toFallbackSuggestion = (music: MatchMusicRecord): MatchSuggestion => ({
	musicId: music.id,
	musicName: music.name,
	musicDate: music.date ?? null,
	currentYoutubeId: music.id_youtube_music ?? null,
	ismv: music.ismv ?? false,
	type: music.type ?? null,
	score: 5,
	matchedOn: ['recherche manuelle'],
	artists: music.artists,
	releases: music.releases,
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)
	setHeader(event, 'Cache-Control', 'no-store')

	const query = getQuery(event)
	const searchQuery = String(query.query ?? '').trim()
	const contextTitle = String(query.contextTitle ?? '').trim()
	const publishedAt =
		typeof query.publishedAt === 'string' ? query.publishedAt : undefined
	const limit = clampInteger(Number(query.limit ?? 8), 1, 12, 8)

	if (searchQuery.length < 2) {
		throw createBadRequestError('query must contain at least 2 characters')
	}

	const supabase = useServerSupabase()
	const { data, error } = await supabase
		.from('musics')
		.select(MV_MATCHER_MUSIC_SELECT)
		.ilike('name', `%${searchQuery}%`)
		.order('date', { ascending: false })
		.limit(80)

	if (error) {
		throw handleSupabaseError(error, 'admin.youtube.mv-music-search')
	}

	const musics = ((data ?? []) as RawMatchMusicRow[]).map(toMatchMusicRecord)
	const targetTitle = contextTitle || searchQuery

	return {
		musics: musics
			.map(
				(music) =>
					scoreMusicMatch(targetTitle, publishedAt, music) ?? toFallbackSuggestion(music),
			)
			.sort((left, right) => right.score - left.score)
			.slice(0, limit),
	}
})
