/* eslint-disable @typescript-eslint/no-explicit-any */
// ===== TYPES SUPABASE =====
// Import et réexport des types générés par Supabase
import type { Database, Tables, TablesInsert, TablesUpdate } from './supabase'
export type { Database, Tables, TablesInsert, TablesUpdate }

// Types de base Supabase avec alias plus courts
export type User = Tables<'users'>
export type Artist = Tables<'artists'> & {
	social_links?: any[]
	platform_links?: any[]
	companies?: (Tables<'artist_companies'> & {
		company: Tables<'companies'>
	})[]
}
export type Release = Tables<'releases'> & {
	platform_links?: any[]
}
export type Music = Tables<'musics'>
export type News = Tables<'news'>
export type MusicStyle = Tables<'music_styles'>
export type GeneralTag = Tables<'general_tags'>
export type ArtistSocialLink = Tables<'artist_social_links'>
export type ArtistPlatformLink = Tables<'artist_platform_links'>
export type ReleasePlatformLink = Tables<'release_platform_links'>
export type ArtistRelation = Tables<'artist_relations'>
export type ArtistRelease = Tables<'artist_releases'>
export type MusicArtist = Tables<'music_artists'>
export type MusicRelease = Tables<'music_releases'>
export type NewsArtist = Tables<'news_artists_junction'>

// Types pour les insertions
export type UserInsert = TablesInsert<'users'>
export type ArtistInsert = TablesInsert<'artists'>
export type ReleaseInsert = TablesInsert<'releases'>
export type MusicInsert = TablesInsert<'musics'>
export type NewsInsert = TablesInsert<'news'>

// Types pour les mises à jour
export type UserUpdate = TablesUpdate<'users'>
export type ArtistUpdate = TablesUpdate<'artists'>
export type ReleaseUpdate = TablesUpdate<'releases'>
export type MusicUpdate = TablesUpdate<'musics'>
export type NewsUpdate = TablesUpdate<'news'>

// ===== ENUMS ET TYPES PERSONNALISÉS =====
export type UserRole = 'USER' | 'ADMIN' | 'CONTRIBUTOR'
export type ArtistType = 'SOLO' | 'GROUP'
export type ArtistGender = 'MALE' | 'FEMALE' | 'MIXTE' | 'OTHER' | 'UNKNOWN'
export type ReleaseType = 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE' | 'COMPILATION'
export type MusicType = 'SONG'
export type RelationType = 'MEMBER' | 'GROUP' | 'PRODUCER' | 'COMPOSER'

// ===== TYPES POUR LES COMPOSABLES =====
export type CompanyType = 'LABEL' | 'PUBLISHER' | 'DISTRIBUTOR' | 'MANAGER' | 'AGENCY' | 'STUDIO' | 'OTHER'

export interface Company {
	id: string
	name: string
	description?: string
	type?: CompanyType
	website?: string
	city?: string
	country?: string
	founded_year?: number
	logo_url?: string
	verified?: boolean
	created_at?: string
	updated_at?: string
}

export interface CompanyArtist {
	id: string
	artist_id: string
	company_id: string
	relationship_type: string | null
	start_date: string | null
	end_date: string | null
	is_current: boolean
	created_at: string | null
	updated_at: string | null
}


// ===== TYPES UTILITAIRES =====
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

// ===== TYPES GLOBAUX =====
declare global {
	interface Window {
		enableDevLogs?: () => void
	}
}

// ===== TYPES COMPOSABLES =====
export interface UseSupabaseReturn<T> {
	data: Ref<T[]>
	loading: Ref<boolean>
	error: Ref<string | null>
	fetch: () => Promise<void>
	create: (item: any) => Promise<T | null>
	update: (id: string, updates: any) => Promise<T | null>
	delete: (id: string) => Promise<boolean>
}

export type ReleaseWithRelations = Release & {
	artists: Artist[]
	musics: Music[]
	platform_links: ReleasePlatformLink[]
}

export type ReleaseWithArtists = Release & {
	artists: Artist[]
}
