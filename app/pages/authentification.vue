<script setup lang="ts">
	import { useAuthModal } from '@/composables/useAuthModal'

	definePageMeta({
		middleware: [],
	})

	useHead({
		title: 'Authentication',
		meta: [
			{
				name: 'description',
				content: 'Authentication',
			},
		],
	})

	// Callback error handling
	const route = useRoute()
	const errorMessage = ref('')
	const { open } = useAuthModal()

	onMounted(() => {
		open()
		const error = route.query.error
		if (error) {
			switch (error) {
				case 'timeout':
					errorMessage.value = 'Connection timeout. Please try again.'
					break
				case 'sync':
					errorMessage.value = 'Profile synchronization error. Please try again.'
					break
				case 'callback':
					errorMessage.value = 'Connection process error. Please try again.'
					break
				default:
					errorMessage.value = 'An error occurred. Please try again.'
			}
		}
		if (!error) {
			const redirect = (route.query.redirect as string) || '/'
			navigateTo(redirect)
		}
	})
</script>

<template>
	<div class="flex min-h-[40vh] items-start justify-center px-4 py-8">
		<div v-if="errorMessage" class="w-full max-w-md">
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="flex items-center">
					<div class="mr-3 text-red-500">⚠️</div>
					<p class="text-sm text-red-700">{{ errorMessage }}</p>
				</div>
			</div>
		</div>
	</div>
</template>
