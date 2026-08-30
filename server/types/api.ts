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
