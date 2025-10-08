/* eslint-disable @typescript-eslint/no-explicit-any */
// ===== TYPES SUPABASE =====
// Import et réexport des types générés par Supabase
import type { Database, Tables, TablesInsert, TablesUpdate } from './supabase'
export type { Database, Tables, TablesInsert, TablesUpdate }

// Types de base Supabase avec alias plus courts
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
	artists?: Tables<'artists'>[]
	releases?: Tables<'releases'>[]
}
export type News = Tables<'news'> & {
	artists?: Tables<'artists'>[]
	user?: Tables<'users'>
}
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
export type Company = Tables<'companies'>

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
// Utiliser les types Supabase directement avec des alias
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

// ===== TYPES POUR LES COMPOSABLES =====
// Types étendus pour les relations
export type CompanyArtist = Tables<'artist_companies'> & {
	company?: Company
	artist?: Artist
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
	artists?: Artist[]
	musics?: Music[]
	platform_links?: ReleasePlatformLink[]
}

export type ReleaseWithArtists = Release & {
	artists?: Artist[]
}

export interface PaginatedResponse<T> {
	releases: T[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export type PaginatedReleaseResponse = PaginatedResponse<ReleaseWithRelations>

// Type pour les composants UI
export type InputMenuItem = {
	id?: string
	label?: string
	[key: string]: any
}

export type ArtistMenuItem = Artist & {
	label: string
}
