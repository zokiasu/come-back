// Import Supabase-generated types for internal use only
import type { Database, Tables, TablesInsert, TablesUpdate } from './supabase'

// Note: Database, Tables, TablesInsert, and TablesUpdate must be imported
// directly from ~/types/supabase in your files to avoid duplication
// These types are not re-exported to avoid duplicate warnings

// Types of base Supabase with alias more courts
export type User = Tables<'users'>
export type Artist = Tables<'artists'> & {
	social_links?: Tables<'artist_social_links'>[]
	platform_links?: Tables<'artist_platform_links'>[]
	companies?: (Tables<'artist_companies'> & {
		company: Tables<'companies'>
	})[]
	groups?: Tables<'artists'>[]
	members?: Tables<'artists'>[]
	releases?: Tables<'releases'>[]
}
export type Release = Tables<'releases'> & {
	platform_links?: Tables<'release_platform_links'>[]
	artists?: Tables<'artists'>[]
	musics?: Tables<'musics'>[]
}
export type Music = Tables<'musics'> & {
	title?: string
	artists?: Tables<'artists'>[]
	releases?: Tables<'releases'>[]
}
export type News = Tables<'news'> & {
	artists?: Tables<'artists'>[]
	user?: Tables<'users'>
}
export type MusicStyle = Tables<'music_styles'>
export type GeneralTag = Tables<'general_tags'>
export type Nationality = Tables<'nationalities'>
export type ArtistSocialLink = Tables<'artist_social_links'>
export type ArtistPlatformLink = Tables<'artist_platform_links'>
export type ReleasePlatformLink = Tables<'release_platform_links'>
export type ArtistRelation = Tables<'artist_relations'>
export type ArtistRelease = Tables<'artist_releases'>
export type MusicArtist = Tables<'music_artists'>
export type MusicRelease = Tables<'music_releases'>
export type NewsArtist = Tables<'news_artists_junction'>
export type Company = Tables<'companies'>

// Types for the rankings user
export interface UserRanking {
	id: string
	user_id: string
	name: string
	description: string | null
	is_public: boolean
	created_at: string | null
	updated_at: string | null
}

export interface UserRankingItem {
	id: string
	ranking_id: string
	music_id: string
	position: number
	added_at: string | null
}

export interface UserRankingWithItems extends UserRanking {
	items: (UserRankingItem & { music: Music })[]
	item_count: number
	user?: User
}

export interface UserRankingWithPreview extends UserRanking {
	item_count: number
	preview_thumbnails: (string | null)[]
	user?: User
}

// Types for the insertions
export type UserInsert = TablesInsert<'users'>
export type ArtistInsert = TablesInsert<'artists'>
export type ReleaseInsert = TablesInsert<'releases'>
export type MusicInsert = TablesInsert<'musics'>
export type NewsInsert = TablesInsert<'news'>

// Types for the updated
export type UserUpdate = TablesUpdate<'users'>
export type ArtistUpdate = TablesUpdate<'artists'>
export type ReleaseUpdate = TablesUpdate<'releases'>
export type MusicUpdate = TablesUpdate<'musics'>
export type NewsUpdate = TablesUpdate<'news'>

// Use the types Supabase directement with the alias
export type UserRole = Database['public']['Enums']['user_role']
export type ArtistType = Database['public']['Enums']['artist_type']
export type ArtistGender = Database['public']['Enums']['gender']
export type ReleaseType = Database['public']['Enums']['release_type']
export type MusicType = Database['public']['Enums']['music_type']
export type RelationType = Database['public']['Enums']['relation_type']
export type ContributionType = Database['public']['Enums']['contribution_type']
export type CompanyType =
	| 'LABEL'
	| 'PUBLISHER'
	| 'DISTRIBUTOR'
	| 'MANAGER'
	| 'AGENCY'
	| 'STUDIO'
	| 'OTHER'

// Extended types for relations
export type CompanyArtist = Tables<'artist_companies'> & {
	company?: Company
	artist?: Artist
}

/**
 * Generic type for junction table results from Supabase
 * When selecting with nested relations, Supabase returns objects like:
 * { artist: Artist } or { release: Release }
 */
export interface JunctionWithArtist {
	artist: Tables<'artists'> | null
}

export interface JunctionWithRelease {
	release: Tables<'releases'> | null
}

export interface JunctionWithMusic {
	music: Tables<'musics'> | null
}

export interface JunctionWithGroup {
	group: Tables<'artists'> | null
}

export interface JunctionWithMember {
	member: Tables<'artists'> | null
}

export interface JunctionWithArtists {
	artists: Tables<'artists'> | null
}

/**
 * Type for music with junction relations from Supabase query
 */
export interface MusicWithJunctions extends Tables<'musics'> {
	artists?: JunctionWithArtist[]
	releases?: JunctionWithRelease[]
}

/**
 * Type for release with junction relations from Supabase query
 */
export interface ReleaseWithJunctions extends Tables<'releases'> {
	artists?: JunctionWithArtist[]
	artist_releases?: JunctionWithArtist[]
	musics?: JunctionWithMusic[]
}

/**
 * Type for artist with junction relations from Supabase query
 */
export interface ArtistWithJunctions extends Tables<'artists'> {
	groups?: JunctionWithGroup[]
	members?: JunctionWithMember[]
	releases?: JunctionWithRelease[]
}

/**
 * Type for news with junction relations from Supabase query
 */
export interface NewsWithJunctions extends Tables<'news'> {
	artists?: JunctionWithArtists[]
}

/**
 * Type for ranking item with music junction from Supabase query
 */
export interface RankingItemWithJunctions {
	id: string
	ranking_id: string
	music_id: string
	position: number
	added_at: string | null
	music?: MusicWithJunctions | null
}

export interface QueryOptions {
	limit?: number
	offset?: number
	orderBy?: string
	ascending?: boolean
	orderDirection?: 'asc' | 'desc'
	startDate?: string
	endDate?: string
}

export interface FilterOptions {
	verified?: boolean
	active?: boolean
	type?: string
	search?: string
	isActive?: boolean
}

declare global {
	interface Window {
		enableDevLogs?: () => void
	}
}

export interface UseSupabaseReturn<T> {
	data: Ref<T[]>
	loading: Ref<boolean>
	error: Ref<string | null>
	fetch: () => Promise<void>
	create: (item: Partial<T>) => Promise<T | null>
	update: (id: string, updates: Partial<T>) => Promise<T | null>
	delete: (id: string) => Promise<boolean>
}

export type ReleaseWithRelations = Release & {
	artists?: Artist[]
	musics?: Music[]
	platform_links?: ReleasePlatformLink[]
}

export type ReleaseWithArtists = Release & {
	artists?: Artist[]
}

export interface PaginatedResponse<T> {
	items: T[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export interface PaginatedReleaseResponse extends Omit<
	PaginatedResponse<ReleaseWithRelations>,
	'items'
> {
	releases: ReleaseWithRelations[]
}

export interface PaginatedArtistResponse extends Omit<
	PaginatedResponse<Artist>,
	'items'
> {
	artists: Artist[]
}

export interface PaginatedMusicResponse extends Omit<PaginatedResponse<Music>, 'items'> {
	musics: Music[]
}

export interface PaginatedCompanyResponse extends Omit<
	PaginatedResponse<Company>,
	'items'
> {
	companies: Company[]
}

// Type for the composants UI
export type InputMenuItem = {
	id?: string
	label?: string
	disabled?: boolean
	icon?: string
	[key: string]: unknown
}

/**
 * Type for artist menu items, compatible with `UInputMenu`
 * Extracts only the required fields to avoid type conflicts
 * (Artist.type = 'SOLO' | 'GROUP' vs UInputMenu type = 'label' | 'separator' | 'item')
 */
export type ArtistMenuItem = {
	id: string
	label: string
	name: string
	description?: string
	image: string | null
}

/**
 * Type for music menu items, compatible with `UInputMenu`
 * Note: intentionally excludes the `type` field to avoid conflicts
 * with `UInputMenu`, which uses `type: 'label' | 'separator' | 'item'`
 */
export type MusicMenuItem = {
	id: string
	label: string
	name: string
	description?: string
	duration?: number | null
	musicType?: MusicType // Renamed to avoid a conflict with UInputMenu.type
	artists?: Artist[]
}

/**
 * Generic type for labeled menu items
 */
export type MenuItem<T> = T & { label: string }


export interface PushPayload {
	title: string
	body: string
	icon?: string
	image?: string
	url?: string
	tag?: string
}

export interface NotificationPreferences {
	user_id: string
	push_enabled: boolean
	daily_comeback: boolean
	weekly_comeback: boolean
	followed_artist_alerts: boolean
	updated_at: string | null
}

export type FollowedArtist = Pick<
	Artist,
	'id' | 'name' | 'image' | 'verified' | 'type'
> & {
	followed_at: string | null
}
