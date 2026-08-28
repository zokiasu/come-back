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
	user?: PublicRankingUser
}

export interface UserRankingWithPreview extends UserRanking {
	item_count: number
	preview_thumbnails: (string | null)[]
	user?: PublicRankingUser
}

export type PublicRankingUser = Pick<User, 'id' | 'name' | 'photo_url'>

// Types for the insertions
export type ArtistInsert = TablesInsert<'artists'>
export type MusicInsert = TablesInsert<'musics'>

// Types for the updated
export type ArtistUpdate = TablesUpdate<'artists'>

// Use the types Supabase directement with the alias
export type UserRole = Database['public']['Enums']['user_role']
export type ArtistType = Database['public']['Enums']['artist_type']
export type ArtistGender = Database['public']['Enums']['gender']

/**
 * Editable subset of an artist used by the create/edit form.
 * This is the single source of truth for the shared artist editor shell.
 */
export type ArtistEditorModel = {
	id?: string
	name: string
	id_youtube_music: string | null
	type: ArtistType
	gender: ArtistGender
	active_career: boolean
	description: string | null
	image: string | null
	birth_date: string | null
	debut_date: string | null
}

export type ReleaseType = Database['public']['Enums']['release_type']
export type MusicType = Database['public']['Enums']['music_type']
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

export interface PaginatedResponse<T> {
	items: T[]
	total: number
	page: number
	limit: number
	totalPages: number
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
