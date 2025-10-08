import type { User } from '~/types'

export function useSupabaseFunction() {
	const supabase = useSupabaseClient()
	const userStore = useUserStore()
	const toast = useToast()

	// Updates user data in the 'users' table in Supabase.
	const updateUserData = async (user: User) => {
		try {
			const { data, error } = await supabase
				.from('users')
				.update({
					...user,
					updated_at: new Date().toISOString(),
				} as any)
				.eq('id', user.id)
				.select()
				.single()

			if (error) {
				console.error('Error updating user:', error)
				throw error
			}

			userStore.setUserData(data as any)
			return data
		} catch (error) {
			console.error('Error updating document:', error)
			throw error
		}
	}

	// Gets user data from the 'users' table in Supabase based on the provided ID.
	const getUserData = async (id: string): Promise<User | null> => {
		try {
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('id', id)
				.single()

			if (error) {
				console.error('Error fetching user:', error)
				return null
			}

			return data
		} catch (error) {
			console.error('Error in getUserData:', error)
			return null
		}
	}

	// Fetches releases by a specific artist from the 'releases' table in Supabase.
	const getReleasesByArtistId = async (artistId: string) => {
		try {
			const { data, error } = await supabase
				.from('releases')
				.select('*')
				.eq('artists_id', artistId)
				.order('date', { ascending: false })

			if (error) {
				console.error('Erreur lors de la récupération des releases:', error)
				return []
			}

			return data || []
		} catch (error) {
			console.error('Erreur lors de la récupération des releases:', error)
			return []
		}
	}

	return {
		updateUserData,
		getUserData,
		getReleasesByArtistId,
	}
}
