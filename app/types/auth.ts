import type { Database } from './supabase'

// Types pour les données utilisateur de Supabase
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

// Interface pour les données d'insertion utilisateur
export interface UserInsertData {
	id: string
	email: string
	name: string
	photo_url: string
	role: 'USER' | 'ADMIN'
	created_at?: string
	updated_at: string
}

// Interface pour les données de mise à jour utilisateur
export interface UserUpdateData {
	id: string
	email?: string
	name?: string
	photo_url?: string
	role?: 'USER' | 'ADMIN'
	updated_at: string
}

// Interface pour les réponses RPC d'analyse de suppression
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

// Interface pour les réponses RPC de suppression simple
export interface ArtistDeletionResponse {
	success?: boolean
	message?: string
	artist_name?: string
}

// Interface pour les contenus exclusifs
export interface ExclusiveContent {
	exclusive_releases?: Array<Database['public']['Tables']['releases']['Row']>
	exclusive_musics?: Array<Database['public']['Tables']['musics']['Row']>
	exclusive_news?: Array<Database['public']['Tables']['news']['Row']>
}
