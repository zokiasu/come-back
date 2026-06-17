import { describe, expect, it } from 'vitest'
import {
	clampInteger,
	createMusicPoolWindow,
	decodeHtmlEntities,
	extractMatchTokens,
	isEligibleMvCandidate,
	mapYouTubeThumbnails,
	normalizeMatchText,
	parseDateRange,
	parseIsoDateInput,
	parseMvKeywords,
	parseYouTubeDuration,
	scoreMusicMatch,
	toMatchMusicRecord,
	type MatchMusicRecord,
	type RawMatchMusicRow,
} from '#server/utils/youtubeMvMatcher'

const expectBadRequest = (action: () => unknown) => {
	expect(action).toThrowError(
		expect.objectContaining({
			statusCode: 400,
			statusMessage: 'Bad Request',
		}),
	)
}

describe('parseMvKeywords', () => {
	it('should use defaults when input is missing or empty', () => {
		expect(parseMvKeywords()).toEqual(['MV', 'M/V', 'Music Video', 'Track Video'])
		expect(parseMvKeywords(' , ')).toEqual(['MV', 'M/V', 'Music Video', 'Track Video'])
	})

	it('should parse arrays and comma-separated strings', () => {
		expect(parseMvKeywords(['MV', ' Performance Video '])).toEqual([
			'MV',
			'Performance Video',
		])
		expect(parseMvKeywords('MV,M/V,Music Video')).toEqual(['MV', 'M/V', 'Music Video'])
	})
})

describe('date and number parsing', () => {
	it('should clamp non-finite and out-of-range integers', () => {
		expect(clampInteger(Number.NaN, 1, 10, 5)).toBe(5)
		expect(clampInteger(-10, 1, 10, 5)).toBe(1)
		expect(clampInteger(50, 1, 10, 5)).toBe(10)
		expect(clampInteger(7.9, 1, 10, 5)).toBe(7)
	})

	it('should parse ISO dates and reject invalid ranges', () => {
		expect(parseIsoDateInput('2024-05-13', 'startDate').toISOString()).toBe(
			'2024-05-13T00:00:00.000Z',
		)
		expectBadRequest(() => parseIsoDateInput('13/05/2024', 'startDate'))
		expectBadRequest(() => parseDateRange('2024-05-15', '2024-05-13'))
		expectBadRequest(() => parseDateRange('2024-01-01', '2024-04-01', 30))
	})

	it('should create a padded music pool window', () => {
		const { start, end } = createMusicPoolWindow(
			new Date('2024-05-10T00:00:00.000Z'),
			new Date('2024-05-20T23:59:59.999Z'),
			5,
		)

		expect(start).toBe('2024-05-05T00:00:00.000Z')
		expect(end).toBe('2024-05-25T23:59:59.999Z')
	})
})

describe('text normalization', () => {
	it('should decode HTML entities', () => {
		expect(decodeHtmlEntities('A&amp;B&#39;s&nbsp;MV')).toBe("A&B's MV")
	})

	it('should remove video noise and normalize tokens', () => {
		expect(normalizeMatchText('[Official MV] aespa - Supernova')).toBe('aespa supernova')
		expect(extractMatchTokens('Girls’ Generation - FOREVER 1')).toEqual([
			'girls',
			'generation',
			'forever',
			'1',
		])
	})

	it('should reject ineligible YouTube candidates', () => {
		expect(isEligibleMvCandidate('aespa Supernova Official MV')).toBe(true)
		expect(isEligibleMvCandidate('aespa Supernova teaser')).toBe(false)
		expect(isEligibleMvCandidate('aespa Supernova shorts')).toBe(false)
	})
})

describe('record mapping and scoring', () => {
	it('should flatten Supabase music relation rows', () => {
		const rawMusic = {
			id: 'music-1',
			name: 'Supernova',
			date: '2024-05-13',
			id_youtube_music: null,
			ismv: false,
			type: null,
			artists: [
				{ artist: { id: 'artist-1', name: 'aespa', image: null } },
				{ artist: null },
			],
			releases: [
				{
					release: {
						id: 'release-1',
						name: 'Armageddon',
						date: '2024-05-27',
						image: null,
					},
				},
				{ release: null },
			],
		} as unknown as RawMatchMusicRow

		expect(toMatchMusicRecord(rawMusic)).toEqual({
			id: 'music-1',
			name: 'Supernova',
			date: '2024-05-13',
			id_youtube_music: null,
			ismv: false,
			type: null,
			artists: [{ id: 'artist-1', name: 'aespa', image: null }],
			releases: [
				{
					id: 'release-1',
					name: 'Armageddon',
					date: '2024-05-27',
					image: null,
				},
			],
		})
	})

	it('should score likely MV matches and ignore unrelated candidates', () => {
		const music: MatchMusicRecord = {
			id: 'music-1',
			name: 'Supernova',
			date: '2024-05-13',
			id_youtube_music: null,
			ismv: false,
			type: null,
			artists: [{ id: 'artist-1', name: 'aespa' }],
			releases: [{ id: 'release-1', name: 'Armageddon', date: '2024-05-27' }],
		}

		const match = scoreMusicMatch(
			'aespa Supernova Official Music Video',
			'2024-05-14T00:00:00.000Z',
			music,
		)

		expect(match?.score).toBeGreaterThanOrEqual(90)
		expect(match?.matchedOn).toContain('artiste')
		expect(match?.matchedOn).toContain('date proche')
		expect(scoreMusicMatch('Completely unrelated song', '2024-05-14', music)).toBeNull()
	})
})

describe('YouTube metadata helpers', () => {
	it('should map thumbnails in preferred order', () => {
		expect(
			mapYouTubeThumbnails({
				high: { url: 'https://img/high.jpg', width: 480, height: 360 },
				default: { url: 'https://img/default.jpg' },
			}),
		).toEqual([
			{ url: 'https://img/default.jpg', width: undefined, height: undefined },
			{ url: 'https://img/high.jpg', width: 480, height: 360 },
		])
	})

	it('should parse ISO 8601 YouTube durations', () => {
		expect(parseYouTubeDuration('PT3M42S')).toBe(222)
		expect(parseYouTubeDuration('PT1H2M3S')).toBe(3723)
		expect(parseYouTubeDuration('invalid')).toBeNull()
		expect(parseYouTubeDuration(null)).toBeNull()
	})
})
