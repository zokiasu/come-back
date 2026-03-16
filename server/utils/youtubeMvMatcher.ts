import type { Database, Tables } from '~/types/supabase'
import { createBadRequestError } from './errorHandler'

export const DEFAULT_MV_KEYWORDS = ['MV', 'M/V', 'Music Video', 'Track Video'] as const
export const MAX_MV_SCAN_DAYS = 60
export const EXCLUDED_MV_CANDIDATE_PATTERNS = [
	/\bbehind\b/iu,
	/\breacts?\b/iu,
	/\breaction\b/iu,
	/\bpreview\b/iu,
	/미리보기/iu,
	/\bteaser\b/iu,
	/\bshorts?\b/iu,
	/\byoutubeshorts\b/iu,
	/\balert\b/iu,
	/\bfor video\b/iu,
	/\bstatus\b/iu,
	/\bwhatsappstatus\b/iu,
	/\bviral\b/iu,
]

export const MV_MATCHER_MUSIC_SELECT = `
	id,
	name,
	date,
	id_youtube_music,
	ismv,
	type,
	artists:music_artists(
		artist:artists(id, name, image)
	),
	releases:music_releases(
		release:releases(id, name, date, image)
	)
`

export type MatchArtist = {
	id: string
	name: string
	image?: string | null
}

export type MatchRelease = {
	id: string
	name: string
	date?: string | null
	image?: string | null
}

export type MatchMusicRecord = {
	id: string
	name: string
	date?: string | null
	id_youtube_music?: string | null
	ismv?: boolean
	type?: Database['public']['Enums']['music_type'] | null
	artists: MatchArtist[]
	releases: MatchRelease[]
}

export type MatchSuggestion = {
	musicId: string
	musicName: string
	musicDate?: string | null
	currentYoutubeId?: string | null
	ismv?: boolean
	type?: Database['public']['Enums']['music_type'] | null
	score: number
	matchedOn: string[]
	artists: MatchArtist[]
	releases: MatchRelease[]
}

export type RawMatchMusicRow = Pick<
	Tables<'musics'>,
	'id' | 'name' | 'date' | 'id_youtube_music' | 'ismv' | 'type'
> & {
	artists?: Array<{
		artist: Pick<Tables<'artists'>, 'id' | 'name' | 'image'> | null
	}>
	releases?: Array<{
		release: Pick<Tables<'releases'>, 'id' | 'name' | 'date' | 'image'> | null
	}>
}

const TITLE_NOISE_PATTERNS = [
	/\[[^\]]*\]/gu,
	/\([^)]*\)/gu,
	/\{[^}]*\}/gu,
	/official\s+(music\s+)?video/gu,
	/official\s+mv/gu,
	/official\s+m\s*\/\s*v/gu,
	/music\s+video/gu,
	/track\s+video/gu,
	/m\s*\/\s*v/gu,
	/\bmv\b/gu,
	/visualizer/gu,
	/teaser/gu,
	/performance\s+video/gu,
	/lyric\s+video/gu,
	/live\s+clip/gu,
]

export const parseMvKeywords = (input?: string | string[]): string[] => {
	if (!input) return [...DEFAULT_MV_KEYWORDS]

	const values = Array.isArray(input) ? input : input.split(',')
	const parsed = values.map((value) => value.trim()).filter(Boolean)

	return parsed.length > 0 ? parsed : [...DEFAULT_MV_KEYWORDS]
}

export const decodeHtmlEntities = (text: string | null | undefined): string => {
	if (!text) return ''

	const entities: Record<string, string> = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'",
		'&apos;': "'",
		'&nbsp;': ' ',
	}

	return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => entities[entity] || entity)
}

export const clampInteger = (
	value: number,
	min: number,
	max: number,
	fallback: number,
): number => {
	if (!Number.isFinite(value)) return fallback
	return Math.min(Math.max(Math.trunc(value), min), max)
}

export const parseIsoDateInput = (value: string, fieldName: string): Date => {
	if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
		throw createBadRequestError(`${fieldName} must use YYYY-MM-DD format`)
	}

	const date = new Date(`${value}T00:00:00.000Z`)
	if (Number.isNaN(date.getTime())) {
		throw createBadRequestError(`${fieldName} is invalid`)
	}

	return date
}

export const parseDateRange = (
	startDate: string,
	endDate: string,
	maxDays: number = MAX_MV_SCAN_DAYS,
) => {
	const start = parseIsoDateInput(startDate, 'startDate')
	const end = parseIsoDateInput(endDate, 'endDate')
	end.setUTCHours(23, 59, 59, 999)

	if (start > end) {
		throw createBadRequestError('startDate must be before endDate')
	}

	const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
	if (diffDays > maxDays) {
		throw createBadRequestError(`Date range cannot exceed ${maxDays} days`)
	}

	return { start, end }
}

export const createMusicPoolWindow = (
	start: Date,
	end: Date,
	paddingDays: number = 45,
) => {
	const startWindow = new Date(start)
	const endWindow = new Date(end)
	startWindow.setUTCDate(startWindow.getUTCDate() - paddingDays)
	endWindow.setUTCDate(endWindow.getUTCDate() + paddingDays)

	return {
		start: startWindow.toISOString(),
		end: endWindow.toISOString(),
	}
}

export const toMatchMusicRecord = (music: RawMatchMusicRow): MatchMusicRecord => {
	return {
		id: music.id,
		name: music.name,
		date: music.date,
		id_youtube_music: music.id_youtube_music,
		ismv: music.ismv,
		type: music.type,
		artists:
			music.artists
				?.map((item) => item.artist)
				.filter((artist): artist is Pick<Tables<'artists'>, 'id' | 'name' | 'image'> =>
					Boolean(artist?.id),
				)
				.map((artist) => ({
					id: artist.id,
					name: artist.name,
					image: artist.image,
				})) ?? [],
		releases:
			music.releases
				?.map((item) => item.release)
				.filter(
					(
						release,
					): release is Pick<Tables<'releases'>, 'id' | 'name' | 'date' | 'image'> =>
						Boolean(release?.id),
				)
				.map((release) => ({
					id: release.id,
					name: release.name,
					date: release.date,
					image: release.image,
				})) ?? [],
	}
}

export const normalizeMatchText = (value: string | null | undefined): string => {
	if (!value) return ''

	let normalized = value
		.normalize('NFD')
		.replace(/\p{Diacritic}+/gu, '')
		.toLowerCase()

	for (const pattern of TITLE_NOISE_PATTERNS) {
		normalized = normalized.replace(pattern, ' ')
	}

	normalized = normalized
		.replace(/&/gu, ' and ')
		.replace(/[’'`]/gu, '')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.replace(/\s+/gu, ' ')
		.trim()

	return normalized
}

export const extractMatchTokens = (value: string | null | undefined): string[] => {
	const normalized = normalizeMatchText(value)
	if (!normalized) return []

	return normalized
		.split(' ')
		.map((token) => token.trim())
		.filter(Boolean)
}

export const isEligibleMvCandidate = (title: string | null | undefined): boolean => {
	if (!title) return false

	return EXCLUDED_MV_CANDIDATE_PATTERNS.every((pattern) => !pattern.test(title))
}

const calculateTokenOverlap = (left: string[], right: string[]): number => {
	if (left.length === 0 || right.length === 0) return 0

	const leftSet = new Set(left)
	const rightSet = new Set(right)
	let common = 0

	for (const token of leftSet) {
		if (rightSet.has(token)) common += 1
	}

	return common / Math.max(leftSet.size, rightSet.size)
}

const getDaysDifference = (
	left: string | null | undefined,
	right: string | null | undefined,
) => {
	if (!left || !right) return null

	const leftDate = new Date(left)
	const rightDate = new Date(right)

	if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
		return null
	}

	const diff = Math.abs(leftDate.getTime() - rightDate.getTime())
	return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export const scoreMusicMatch = (
	candidateTitle: string,
	publishedAt: string | null | undefined,
	music: MatchMusicRecord,
): MatchSuggestion | null => {
	const matchedOn: string[] = []
	let score = 0

	const normalizedCandidateTitle = normalizeMatchText(candidateTitle)
	const candidateTokens = extractMatchTokens(candidateTitle)
	const normalizedMusicName = normalizeMatchText(music.name)
	const musicTokens = extractMatchTokens(music.name)

	if (!normalizedCandidateTitle || !normalizedMusicName) return null

	if (normalizedCandidateTitle === normalizedMusicName) {
		score += 75
		matchedOn.push('titre exact')
	} else if (
		normalizedCandidateTitle.includes(normalizedMusicName) ||
		normalizedMusicName.includes(normalizedCandidateTitle)
	) {
		score += 60
		matchedOn.push('titre inclus')
	} else {
		const titleOverlap = calculateTokenOverlap(candidateTokens, musicTokens)

		if (titleOverlap >= 0.8) {
			score += 48
			matchedOn.push('titre tres proche')
		} else if (titleOverlap >= 0.55) {
			score += 36
			matchedOn.push('titre proche')
		} else if (titleOverlap >= 0.35) {
			score += 22
			matchedOn.push('titre partiel')
		}
	}

	let artistMatchCount = 0
	for (const artist of music.artists) {
		const normalizedArtist = normalizeMatchText(artist.name)
		if (!normalizedArtist) continue

		if (normalizedCandidateTitle.includes(normalizedArtist)) {
			artistMatchCount += 1
		}
	}

	if (artistMatchCount > 0) {
		score += Math.min(artistMatchCount * 15, 30)
		matchedOn.push('artiste')
	}

	for (const release of music.releases) {
		const normalizedRelease = normalizeMatchText(release.name)
		if (!normalizedRelease) continue

		if (normalizedCandidateTitle.includes(normalizedRelease)) {
			score += 12
			matchedOn.push('release')
			break
		}
	}

	const daysDifference = getDaysDifference(publishedAt, music.date)
	if (daysDifference !== null) {
		if (daysDifference <= 3) {
			score += 15
			matchedOn.push('date proche')
		} else if (daysDifference <= 14) {
			score += 10
			matchedOn.push('date coherente')
		} else if (daysDifference <= 45) {
			score += 5
		}
	}

	if (score < 25) return null

	return {
		musicId: music.id,
		musicName: music.name,
		musicDate: music.date ?? null,
		currentYoutubeId: music.id_youtube_music ?? null,
		ismv: music.ismv ?? false,
		type: music.type ?? null,
		score,
		matchedOn,
		artists: music.artists,
		releases: music.releases,
	}
}

export const mapYouTubeThumbnails = (
	thumbnails:
		| Record<string, { url: string; width?: number; height?: number } | undefined>
		| null
		| undefined,
) => {
	if (!thumbnails) return null

	const orderedKeys = ['default', 'medium', 'high', 'standard', 'maxres'] as const
	const mapped = orderedKeys
		.map((key) => thumbnails[key])
		.filter((thumbnail): thumbnail is { url: string; width?: number; height?: number } =>
			Boolean(thumbnail?.url),
		)
		.map((thumbnail) => ({
			url: thumbnail.url,
			width: thumbnail.width,
			height: thumbnail.height,
		}))

	return mapped.length > 0 ? mapped : null
}

export const parseYouTubeDuration = (
	isoDuration: string | null | undefined,
): number | null => {
	if (!isoDuration) return null

	const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/u)
	if (!match) return null

	const hours = Number(match[1] ?? 0)
	const minutes = Number(match[2] ?? 0)
	const seconds = Number(match[3] ?? 0)

	return hours * 3600 + minutes * 60 + seconds
}
