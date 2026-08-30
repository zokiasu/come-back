import type { Artist, ArtistType } from '~/types'

export interface ArtistPageOptions {
	search?: string
	type?: ArtistType
	orderBy?: keyof Artist
	orderDirection?: 'asc' | 'desc'
	general_tags?: string[]
	nationalities?: string[]
	styles?: string[]
	gender?: string
	isActive?: boolean
	onlyWithoutDesc?: boolean
	onlyWithoutSocials?: boolean
	onlyWithoutPlatforms?: boolean
	onlyWithoutStyles?: boolean
	onlyWithStyles?: boolean
	verified?: boolean | null
	skipYoutubeMusicFilter?: boolean
}

export interface ArtistPageResult {
	artists: Artist[]
	total: number
	page: number
	limit: number
	totalPages: number
}
