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


