import type { LocationQuery, LocationQueryValue } from 'vue-router'
import { formatArtistNames } from './artist'
import { formatDate } from './date'

export interface MusicCatalogItem {
	id: string
	id_youtube_music: string | null
	name: string
	title?: string
	thumbnails: unknown
	ismv: boolean
	date: string | null
	duration: number | null
	artists: Array<{ name: string }>
}

export const parseMusicQueryList = (
	value: LocationQueryValue | LocationQueryValue[] | undefined,
): string[] => {
	if (!value) return []

	const rawValues = Array.isArray(value) ? value : [value]
	return rawValues
		.flatMap((entry) => (entry === null ? [] : String(entry).split(',')))
		.map((entry) => entry.trim())
		.filter(Boolean)
}

export const normalizeMusicQuery = (query: LocationQuery): Record<string, string> => {
	return Object.fromEntries(
		Object.entries(query)
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => {
				const normalizedValue = Array.isArray(value)
					? value.map((entry) => String(entry)).join(',')
					: String(value)
				return [key, normalizedValue]
			}),
	)
}

export const stringifyMusicQuery = (query: Record<string, string>): string => {
	return JSON.stringify(
		Object.keys(query)
			.sort()
			.reduce<Record<string, string>>((accumulator, key) => {
				const value = query[key]
				if (value !== undefined) accumulator[key] = value
				return accumulator
			}, {}),
	)
}

export const formatMusicArtists = (artists: { name: string }[] = []): string =>
	formatArtistNames(artists, 'Unknown artist')

export const formatMusicDate = (dateString: string | null | undefined): string => {
	return formatDate(dateString)
}

const getThumbnailUrl = (thumbnail: unknown): string => {
	if (!thumbnail || typeof thumbnail !== 'object' || Array.isArray(thumbnail)) return ''
	if (!('url' in thumbnail)) return ''
	return typeof thumbnail.url === 'string' ? thumbnail.url : ''
}

export const getMusicThumbnailUrl = (thumbnails: unknown): string => {
	if (!Array.isArray(thumbnails)) return ''
	return getThumbnailUrl(thumbnails[2]) || getThumbnailUrl(thumbnails[0])
}
