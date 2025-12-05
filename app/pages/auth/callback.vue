<template>
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center">
			<div
				class="border-cb-primary-500 mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"
			></div>
			<p class="text-center text-lg text-gray-600">Loading</p>
			<p v-if="debugMode" class="mt-2 text-sm text-gray-500">{{ debugInfo }}</p>
			<p class="text-center text-lg text-gray-600">Signing in...</p>
		</div>
	</div>
</template>

<script setup lang="ts">
	const statusMessage = ref('Verifying session...')
	const debugInfo = ref('')
	const debugMode = ref(false) // Enable for debug

	// Disable auth middleware for this page
	definePageMeta({
		middleware: [],
	})

	const user = useSupabaseUser()
	const { ensureUserProfile } = useAuth()

	const handleAuthCallback = async () => {
		try {
			statusMessage.value = 'Verifying session...'
			debugInfo.value = 'Waiting for Supabase user...'

			// Wait for Supabase user to be available
			let attempts = 0
			const maxAttempts = 30 // 30 seconds max

			while (!user.value && attempts < maxAttempts) {
				await new Promise((resolve) => setTimeout(resolve, 1000))
				attempts++
				debugInfo.value = `Attempt ${attempts}/${maxAttempts}...`
			}

			if (!user.value) {
				console.error('❤️ Timeout: No user found after 30 seconds')
				statusMessage.value = 'Connection error'
				await navigateTo('/authentification?error=timeout')
				return
			}

			statusMessage.value = 'Syncing profile...'
			debugInfo.value = 'Creating/updating user profile...'

			// Sync user profile
			const success = await ensureUserProfile()

			if (success) {
				statusMessage.value = 'Redirecting...'
				debugInfo.value = 'Connection successful, redirecting to home'

				// Brief pause so user can see success message
				await new Promise((resolve) => setTimeout(resolve, 500))

				await navigateTo('/')
			} else {
				console.error('❌ Error during profile synchronization')
				statusMessage.value = 'Synchronization error'
				await navigateTo('/authentification?error=sync')
			}
		} catch (err: unknown) {
			console.error('❌ Error during callback:', err)
			statusMessage.value = 'Connection error'
			debugInfo.value = err instanceof Error ? err.message : 'Unknown error'
			await navigateTo('/authentification?error=callback')
		}
	}

	// Handle authentication callback on component mount
	onMounted(async () => {
		// Brief pause to let Supabase initialize
		await new Promise((resolve) => setTimeout(resolve, 500))
		await handleAuthCallback()
	})
</script>
