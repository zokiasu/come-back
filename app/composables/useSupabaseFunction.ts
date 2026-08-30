import type { User } from '~/types'

export function useSupabaseFunction() {
	const userStore = useUserStore()
	const { runMutation } = useMutationTimeout()
	const { requireAuthHeadersFromSession } = useApiAuthHeaders()

	// Updates user data in the 'users' table in Supabase.
	const updateUserData = async (user: User) => {
		try {
			const data = await runMutation(
				$fetch<User>('/api/users/profile', {
					method: 'PUT',
					headers: await requireAuthHeadersFromSession(),
					body: {
						name: user.name,
						photo_url: user.photo_url,
					},
				}),
				'Updating the user profile timed out. Please try again.',
			)

			userStore.setUserData(data)
			return data
		} catch (error) {
			console.error('Error updating document:', error)
			throw error
		}
	}

	// Gets user data from the 'users' table in Supabase based on the provided ID.
	const getUserData = async (id: string): Promise<User | null> => {
		try {
			return await $fetch<User>(`/api/users/${id}`, {
				headers: await requireAuthHeadersFromSession(),
			})
		} catch (error) {
			console.error('Error in getUserData:', error)
			return null
		}
	}

	return {
		updateUserData,
		getUserData,
	}
}
