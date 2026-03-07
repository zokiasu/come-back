<script setup lang="ts">
	const route = useRoute()
	const toast = useToast()
	const hasShown = ref(false)

	const getMessage = (code: string) => {
		switch (code) {
			case 'auth_required':
				return 'You must be logged in to access this page.'
			case 'timeout':
				return 'Connection timeout. Please try again.'
			case 'sync':
				return 'Profile synchronization error. Please try again.'
			case 'callback':
				return 'Connection process error. Please try again.'
			case 'no_user':
				return 'No user found after authentication. Please try again.'
			default:
				return 'Authentication failed. Please try again.'
		}
	}

	const showToast = () => {
		const error = route.query.authError
		if (!error || typeof error !== 'string') return
		if (hasShown.value) return
		hasShown.value = true

		toast.add({
			title: 'Authentication error',
			description: getMessage(error),
			color: 'error',
			duration: 5000,
		})

		const nextQuery = { ...route.query }
		delete nextQuery.authError
		navigateTo({ query: nextQuery })
	}

	onMounted(showToast)
	watch(
		() => route.query.authError,
		() => {
			hasShown.value = false
			showToast()
		},
	)
</script>

<template>
	<span aria-hidden="true" class="hidden" />
</template>
