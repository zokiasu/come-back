import type { Database } from './supabase'

// Types for the data user of Supabase
export interface SupabaseAuthUser {
	id: string
	email?: string
	user_metadata?: {
		full_name?: string
		name?: string
		avatar_url?: string
		picture?: string
	}
}

// Interface for the data of insertion user
export interface UserInsertData {
	id: string
	email: string
	name: string
	photo_url: string
	role: 'USER' | 'CONTRIBUTOR' | 'ADMIN'
	created_at?: string
	updated_at: string
}

// Interface for user update data
export interface UserUpdateData {
	id: string
	email?: string
	name?: string
	photo_url?: string
	role?: 'USER' | 'CONTRIBUTOR' | 'ADMIN'
	updated_at: string
}

// Interface for delete-analysis RPC responses
export interface ArtistDeletionAnalysis {
	message?: string
	success?: boolean
	details?: {
		impact_analysis?: {
			exclusive_releases?: number
			exclusive_musics?: number
			exclusive_news?: number
		}
	}
}

// Interface for simple-delete RPC responses
export interface ArtistDeletionResponse {
	success?: boolean
	message?: string
	artist_name?: string
}

// Interface for the contenus exclusifs
export interface ExclusiveContent {
	exclusive_releases?: Array<Database['public']['Tables']['releases']['Row']>
	exclusive_musics?: Array<Database['public']['Tables']['musics']['Row']>
	exclusive_news?: Array<Database['public']['Tables']['news']['Row']>
}
