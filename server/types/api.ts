import type { Database } from '~/types/supabase'

/**
 * Database table type helpers
 */
export type Tables<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Update']

/**
 * Common API response structures
 */

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
	data: T[]
	pagination: {
		page: number
		limit: number
		total: number
		totalPages: number
	}
}

/**
 * Standard success response
 */
export interface SuccessResponse<T = any> {
	success: true
	data: T
	message?: string
}

/**
 * Query parameter types for list endpoints
 */
export interface ListQueryParams {
	limit?: number
	offset?: number
	orderBy?: string
	orderDirection?: 'asc' | 'desc'
}

/**
 * Junction table transformation result
 * Used when we need to extract nested data from junction tables
 */
export interface JunctionData<T> {
	[key: string]: T
}

/**
 * Artist with full relations
 */
export interface ArtistWithRelations extends Tables<'artists'> {
	groups?: Tables<'artists'>[]
	members?: Tables<'artists'>[]
	releases?: Tables<'releases'>[]
	companies?: (Tables<'artist_companies'> & {
		company: Tables<'companies'>
	})[]
	social_links?: Tables<'artist_social_links'>[]
	platform_links?: Tables<'artist_platform_links'>[]
}

/**
 * Release with full relations
 */
export interface ReleaseWithRelations extends Tables<'releases'> {
	artists?: Tables<'artists'>[]
	musics?: Tables<'musics'>[]
	platform_links?: Tables<'release_platform_links'>[]
}

/**
 * Music with full relations
 */
export interface MusicWithRelations extends Tables<'musics'> {
	artists?: Tables<'artists'>[]
	releases?: Tables<'releases'>[]
}

/**
 * Company with full relations
 */
export interface CompanyWithRelations extends Tables<'companies'> {
	artists?: (Tables<'artist_companies'> & {
		artist: Tables<'artists'>
	})[]
}

/**
 * API endpoint response types
 */

export interface ArtistCompleteResponse {
	artist: ArtistWithRelations
	social_links: Tables<'artist_social_links'>[]
	platform_links: Tables<'artist_platform_links'>[]
	random_musics: Tables<'musics'>[]
}

export interface ReleaseCompleteResponse {
	release: ReleaseWithRelations
	suggested_releases: ReleaseWithRelations[]
}

export interface CompanyCompleteResponse {
	company: Tables<'companies'>
	company_artists: (Tables<'artist_companies'> & {
		artist: Tables<'artists'>
	})[]
}

/**
 * Dashboard overview response
 */
export interface DashboardOverviewResponse {
	total_artists: number
	total_releases: number
	total_musics: number
	total_news: number
	recent_artists: Tables<'artists'>[]
	recent_releases: Tables<'releases'>[]
	recent_news: Tables<'news'>[]
}
