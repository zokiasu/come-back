<template>
	<div class="mb-6 flex items-start justify-between">
		<div>
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
				<slot>{{ title }}</slot>
			</h2>
		</div>
		<div class="flex items-center space-x-3">
			<div
				v-if="periodDisplay"
				class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-800 dark:bg-blue-900/20"
			>
				<div class="flex items-center space-x-2">
					<UIcon
						name="i-heroicons-calendar-days"
						class="h-4 w-4 text-blue-600 dark:text-blue-400"
					/>
					<p class="text-sm text-blue-700 dark:text-blue-300">
						{{ periodDisplay }}
					</p>
				</div>
			</div>
			<div v-if="loading" class="flex items-center space-x-2">
				<LoadingIndicator size="sm" />
				<span class="text-sm text-gray-500 dark:text-gray-400">Chargement...</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import LoadingIndicator from '~/components/LoadingIndicator.vue'

	interface Props {
		title: string
		periodDisplay?: string
		loading?: boolean
	}

	withDefaults(defineProps<Props>(), {
		periodDisplay: undefined,
		loading: false,
	})
</script>
