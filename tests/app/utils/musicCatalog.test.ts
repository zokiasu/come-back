import { describe, expect, it } from 'vitest'
import {
	formatMusicArtists,
	formatMusicDuration,
	getMusicThumbnailUrl,
	normalizeMusicQuery,
	parseMusicQueryList,
	stringifyMusicQuery,
} from '~/utils/musicCatalog'

describe('music catalog helpers', () => {
	it('normalizes repeated and comma-separated route filters', () => {
		expect(parseMusicQueryList(['aespa,ive', ' le-sserafim ', null])).toEqual([
			'aespa',
			'ive',
			'le-sserafim',
		])
		expect(parseMusicQueryList(undefined)).toEqual([])
	})

	it('produces a stable route-query signature regardless of key order', () => {
		const normalized = normalizeMusicQuery({ years: ['2025', '2026'], search: 'aespa' })

		expect(normalized).toEqual({ years: '2025,2026', search: 'aespa' })
		expect(stringifyMusicQuery(normalized)).toBe(
			stringifyMusicQuery({ search: 'aespa', years: '2025,2026' }),
		)
	})

	it('reads only valid thumbnail JSON and prefers the high-resolution entry', () => {
		expect(
			getMusicThumbnailUrl([
				{ url: 'small.webp' },
				{ url: 'medium.webp' },
				{ url: 'large.webp' },
			]),
		).toBe('large.webp')
		expect(getMusicThumbnailUrl([{ url: 'fallback.webp' }, null])).toBe('fallback.webp')
		expect(getMusicThumbnailUrl({ url: 'not-an-array.webp' })).toBe('')
	})

	it('formats artist and duration fallbacks consistently', () => {
		expect(formatMusicArtists([{ name: 'aespa' }, { name: 'IVE' }])).toBe('aespa, IVE')
		expect(formatMusicArtists()).toBe('Unknown artist')
		expect(formatMusicDuration(185)).toBe('3:05')
	})
})
