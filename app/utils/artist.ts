import type { Artist } from '~/types'

export const formatArtistNames = (
	artists: Array<{ name?: string | null }> | null | undefined,
	fallback = '-',
): string => {
	const names = (artists ?? [])
		.map((artist) => artist.name?.trim())
		.filter(Boolean)
		.join(', ')

	return names || fallback
}

export const getArtistTypeBadgeColor = (type: string | null): 'primary' | 'info' =>
	type === 'SOLO' ? 'primary' : 'info'

export const getArtistGenderBadgeColor = (
	gender: string | null,
): 'info' | 'error' | 'warning' | 'neutral' => {
	switch (gender) {
		case 'MALE':
			return 'info'
		case 'FEMALE':
			return 'error'
		case 'MIXTE':
			return 'warning'
		default:
			return 'neutral'
	}
}

export type ArtistMissingField = 'desc' | 'socials' | 'platforms' | 'styles'

export const getArtistMissingData = (artist: Artist): ArtistMissingField[] => {
	const missing: ArtistMissingField[] = []
	if (!artist.description) missing.push('desc')
	if (!artist.social_links || artist.social_links.length === 0) missing.push('socials')
	if (!artist.platform_links || artist.platform_links.length === 0)
		missing.push('platforms')
	if (!artist.styles || artist.styles.length === 0) missing.push('styles')
	return missing
}

export const getArtistMissingLabels = (artist: Artist): string[] => {
	const labelMap: Record<ArtistMissingField, string> = {
		desc: 'description',
		socials: 'socials',
		platforms: 'platforms',
		styles: 'styles',
	}
	return getArtistMissingData(artist).map((key) => labelMap[key])
}

export const ARTIST_TYPE_FILTER_OPTIONS: { label: string; id: string }[] = [
	{ label: 'All types', id: 'ALL' },
	{ label: 'Solo', id: 'SOLO' },
	{ label: 'Group', id: 'GROUP' },
]

export const ARTIST_GENDER_FILTER_OPTIONS: { label: string; id: string }[] = [
	{ label: 'All genders', id: 'ALL' },
	{ label: 'Male', id: 'MALE' },
	{ label: 'Female', id: 'FEMALE' },
	{ label: 'Mixed', id: 'MIXTE' },
	{ label: 'Unknown', id: 'UNKNOWN' },
]
