export const useAuthModal = () => {
	const isOpen = useState('authModalOpen', () => false)

	const open = () => {
		isOpen.value = true
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
