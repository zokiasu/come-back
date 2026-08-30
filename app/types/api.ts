import type {
	Artist,
	Company,
	Music,
	News,
	Release,
	UserRankingWithPreview,
} from './index'
import type { Tables } from './supabase'

export interface PaginationFields {
	total: number
	page: number
	limit: number
	totalPages: number
}

export type PaginatedCollectionResponse<Key extends string, Item> = PaginationFields & {
	[Collection in Key]: Item[]
}

export type ArtistsPageResponse = PaginatedCollectionResponse<'artists', Artist>
export type CompaniesPageResponse = PaginatedCollectionResponse<'companies', Company>
export type MusicsPageResponse = PaginatedCollectionResponse<'musics', Music>
export type NewsPageResponse = PaginatedCollectionResponse<'news', News>
export type ReleasesPageResponse = PaginatedCollectionResponse<'releases', Release>

export interface ArtistSearchResponse {
	artists: Artist[]
}

export type SearchRelease = Pick<Release, 'id' | 'name' | 'image' | 'date'> & {
	artists: Pick<Artist, 'id' | 'name' | 'image' | 'verified'>[]
	musics: Pick<Music, 'id' | 'name' | 'id_youtube_music' | 'verified'>[]
}

export interface SearchReleaseResponse {
	releases: SearchRelease[]
	totalCount: number
}

export type SearchMusic = Pick<
	Music,
	'id' | 'name' | 'id_youtube_music' | 'duration' | 'date'
> & {
	thumbnailUrl: string | null
	artists: Pick<Artist, 'id' | 'name' | 'image' | 'verified'>[]
	releases: Pick<Release, 'id' | 'name' | 'image' | 'verified'>[]
}

export interface SearchMusicResponse {
	musics: SearchMusic[]
	totalCount: number
}

export type AppNotification = Pick<
	Tables<'user_notifications'>,
	'id' | 'type' | 'title' | 'message' | 'artist_id' | 'release_id' | 'read' | 'created_at'
>

export interface NotificationsResponse {
	notifications: AppNotification[]
	total: number
	unread: number
	page: number
	limit: number
}

export interface RankingListResponse {
	rankings: UserRankingWithPreview[]
	total: number
}

export interface SuccessResponse {
	success: boolean
}

export interface CompaniesStatsResponse {
	total: number
	verified: number
	totalRelations: number
	activeRelations: number
	typeDistribution: Record<string, number>
}
