import type { Artist, ArtistType } from '~/types'
import type { ArtistsPageResponse } from '~/types/api'

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

export type ArtistPageResult = ArtistsPageResponse
