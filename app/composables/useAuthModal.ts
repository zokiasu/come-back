export const useAuthModal = () => {
	const isOpen = useState('authModalOpen', () => false)
	const supabaseUser = useSupabaseUser()

	const open = async () => {
		if (supabaseUser.value?.id) {
			isOpen.value = false
			return
		}

		isOpen.value = true

		try {
			if (import.meta.client) {
				const { getTrustedAuthUser, syncUserProfileFromAuthUser } = useAuth()
				const sessionUser = await getTrustedAuthUser()

				if (sessionUser?.id) {
					await syncUserProfileFromAuthUser(sessionUser)
					isOpen.value = false
				}
			}
		} catch (error) {
			console.error('Error while opening auth modal:', error)
		}
	}

	const close = () => {
		isOpen.value = false
	}

	return {
		isOpen,
		open,
		close,
	}
}
