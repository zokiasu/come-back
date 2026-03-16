import {
	createBadRequestError,
	createInternalError,
	handleSupabaseError,
} from '../../../utils/errorHandler'
import {
	MV_MATCHER_MUSIC_SELECT,
	clampInteger,
	createMusicPoolWindow,
	decodeHtmlEntities,
	isEligibleMvCandidate,
	mapYouTubeThumbnails,
	parseDateRange,
	parseMvKeywords,
	parseYouTubeDuration,
	scoreMusicMatch,
	toMatchMusicRecord,
	type RawMatchMusicRow,
} from '../../../utils/youtubeMvMatcher'

type YouTubeThumbnailMap = Record<
	string,
	{ url: string; width?: number; height?: number } | undefined
>

type YouTubeSearchItem = {
	id?: {
		videoId?: string
	}
	snippet?: {
		publishedAt?: string
		channelId?: string
		channelTitle?: string
		title?: string
		description?: string
		thumbnails?: YouTubeThumbnailMap
	}
}

type YouTubeSearchResponse = {
	items?: YouTubeSearchItem[]
}

type YouTubeVideoDetailsResponse = {
	items?: Array<{
		id?: string
		contentDetails?: {
			duration?: string
		}
	}>
}

type CandidateVideo = {
	videoId: string
	title: string
	description: string
	publishedAt: string
	channelId: string
	channelTitle: string
	thumbnailUrl: string | null
	matchedKeywords: string[]
}

const MIN_MV_DURATION_SECONDS = 120

const fetchKeywordCandidates = async (
	apiKey: string,
	keyword: string,
	publishedAfter: string,
	publishedBefore: string,
	limit: number,
): Promise<CandidateVideo[]> => {
	try {
		const response = await $fetch<YouTubeSearchResponse>(
			'https://www.googleapis.com/youtube/v3/search',
			{
				query: {
					part: 'snippet',
					type: 'video',
					order: 'date',
					maxResults: limit,
					publishedAfter,
					publishedBefore,
					videoCategoryId: '10',
					q: keyword,
					key: apiKey,
				},
			},
		)

		return (response.items ?? [])
			.map((item) => {
				const thumbnailList = mapYouTubeThumbnails(item.snippet?.thumbnails)

				return {
					videoId: item.id?.videoId ?? '',
					title: decodeHtmlEntities(item.snippet?.title),
					description: decodeHtmlEntities(item.snippet?.description),
					publishedAt: item.snippet?.publishedAt ?? '',
					channelId: item.snippet?.channelId ?? '',
					channelTitle:
						decodeHtmlEntities(item.snippet?.channelTitle) || 'Unknown channel',
					thumbnailUrl: thumbnailList?.[2]?.url ?? thumbnailList?.[0]?.url ?? null,
					matchedKeywords: [keyword],
				}
			})
			.filter(
				(item) =>
					item.videoId &&
					item.title &&
					item.publishedAt &&
					isEligibleMvCandidate(item.title),
			)
	} catch (error) {
		throw createInternalError(
			`Failed to fetch YouTube MV candidates for keyword "${keyword}"`,
			error,
		)
	}
}

const fetchEligibleDurationIds = async (
	apiKey: string,
	videoIds: string[],
): Promise<Set<string>> => {
	const eligibleIds = new Set<string>()

	for (let index = 0; index < videoIds.length; index += 50) {
		const batch = videoIds.slice(index, index + 50)
		if (batch.length === 0) continue

		const response = await $fetch<YouTubeVideoDetailsResponse>(
			'https://www.googleapis.com/youtube/v3/videos',
			{
				query: {
					part: 'contentDetails',
					id: batch.join(','),
					key: apiKey,
				},
			},
		)

		for (const item of response.items ?? []) {
			if (!item.id) continue

			const duration = parseYouTubeDuration(item.contentDetails?.duration)
			if (duration === null || duration >= MIN_MV_DURATION_SECONDS) {
				eligibleIds.add(item.id)
			}
		}
	}

	return eligibleIds
}

export default defineEventHandler(async (event) => {
	await requireAdmin(event)
	setHeader(event, 'Cache-Control', 'no-store')

	const query = getQuery(event)
	const startDate = String(query.startDate ?? '').trim()
	const endDate = String(query.endDate ?? '').trim()

	if (!startDate || !endDate) {
		throw createBadRequestError('startDate and endDate are required')
	}

	const { start, end } = parseDateRange(startDate, endDate)
	const keywords = parseMvKeywords(query.keywords as string | string[] | undefined)
	const limit = clampInteger(Number(query.limit ?? 24), 5, 40, 24)
	const perKeywordLimit = Math.min(
		20,
		Math.max(6, Math.ceil(limit / keywords.length) + 3),
	)

	const config = useRuntimeConfig()
	const apiKey = config.public.YOUTUBE_API_KEY
	if (!apiKey) {
		throw createInternalError('YOUTUBE_API_KEY is missing')
	}

	const searchResults = await Promise.all(
		keywords.map(async (keyword) => {
			try {
				return await fetchKeywordCandidates(
					apiKey,
					keyword,
					start.toISOString(),
					end.toISOString(),
					perKeywordLimit,
				)
			} catch (error) {
				console.warn(`[admin.youtube.mv-candidates] keyword "${keyword}" failed:`, error)
				return []
			}
		}),
	)

	if (searchResults.every((result) => result.length === 0)) {
		throw createInternalError('Failed to fetch YouTube MV candidates for all keywords')
	}

	const dedupedMap = new Map<string, CandidateVideo>()
	for (const candidate of searchResults.flat()) {
		const existing = dedupedMap.get(candidate.videoId)
		if (!existing) {
			dedupedMap.set(candidate.videoId, candidate)
			continue
		}

		existing.matchedKeywords = Array.from(
			new Set([...existing.matchedKeywords, ...candidate.matchedKeywords]),
		)
	}

	const dedupedCandidates = Array.from(dedupedMap.values()).sort((left, right) =>
		right.publishedAt.localeCompare(left.publishedAt),
	)

	const supabase = useServerSupabase()
	const videoIds = dedupedCandidates.map((item) => item.videoId)
	const existingIds = new Set<string>()

	if (videoIds.length > 0) {
		const { data: existingMusics, error: existingError } = await supabase
			.from('musics')
			.select('id_youtube_music')
			.in('id_youtube_music', videoIds)

		if (existingError) {
			throw handleSupabaseError(existingError, 'admin.youtube.mv-candidates.existing')
		}

		for (const music of existingMusics ?? []) {
			if (music.id_youtube_music) {
				existingIds.add(music.id_youtube_music)
			}
		}
	}

	const unmatchedCandidates = dedupedCandidates.filter(
		(candidate) => !existingIds.has(candidate.videoId),
	)
	const eligibleDurationIds = await fetchEligibleDurationIds(
		apiKey,
		unmatchedCandidates.map((candidate) => candidate.videoId),
	)
	const candidatesToMatch = unmatchedCandidates
		.filter((candidate) => eligibleDurationIds.has(candidate.videoId))
		.slice(0, limit)

	const musicWindow = createMusicPoolWindow(start, end)
	const { data: rawMusics, error: musicsError } = await supabase
		.from('musics')
		.select(MV_MATCHER_MUSIC_SELECT)
		.gte('date', musicWindow.start)
		.lte('date', musicWindow.end)
		.order('date', { ascending: false })
		.limit(1500)

	if (musicsError) {
		throw handleSupabaseError(musicsError, 'admin.youtube.mv-candidates.music-pool')
	}

	const musicPool = ((rawMusics ?? []) as RawMatchMusicRow[]).map(toMatchMusicRecord)

	return {
		candidates: candidatesToMatch.map((candidate) => ({
			...candidate,
			matchedKeyword: candidate.matchedKeywords[0] ?? null,
			suggestions: musicPool
				.map((music) => scoreMusicMatch(candidate.title, candidate.publishedAt, music))
				.filter((suggestion): suggestion is NonNullable<typeof suggestion> =>
					Boolean(suggestion),
				)
				.sort((left, right) => right.score - left.score)
				.slice(0, 6),
		})),
		scannedVideos: dedupedCandidates.length,
		ignoredExisting: dedupedCandidates.length - candidatesToMatch.length,
		keywords,
		from: start.toISOString(),
		to: end.toISOString(),
	}
})
