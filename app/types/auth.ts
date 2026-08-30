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
}

// Interface for user update data
export interface UserUpdateData {
	email?: string
	name?: string
	photo_url?: string
	updated_at: string
}
