<script setup lang="ts">
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

	// Log initial
	console.log('📄 Authentication page loaded')

	// Callback error handling
	const route = useRoute()
	const errorMessage = ref('')

	onMounted(() => {
		const error = route.query.error
		if (error) {
			switch (error) {
				case 'timeout':
					errorMessage.value =
						'Connection timeout. Please try again.'
					break
				case 'sync':
					errorMessage.value =
						'Profile synchronization error. Please try again.'
					break
				case 'callback':
					errorMessage.value =
						'Connection process error. Please try again.'
					break
				default:
					errorMessage.value = 'An error occurred. Please try again.'
			}
		}
	})
</script>

<template>
	<div class="flex items-center justify-center sm:min-h-[calc(100vh-160px)]">
		<div class="w-full md:w-1/2 lg:w-1/3">
			<!-- Error message -->
			<div
				v-if="errorMessage"
				class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4"
			>
				<div class="flex items-center">
					<div class="mr-3 text-red-500">⚠️</div>
					<p class="text-sm text-red-700">{{ errorMessage }}</p>
				</div>
			</div>

			<GoogleSignInButton />
		</div>
	</div>
</template>
