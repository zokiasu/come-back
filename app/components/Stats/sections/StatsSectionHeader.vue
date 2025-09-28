<template>
	<div class="flex items-start justify-between">
		<div>
			<h2 class="text-xl font-semibold text-white">
				<slot>{{ title }}</slot>
			</h2>
		</div>
		<div class="flex items-center space-x-3">
			<div v-if="periodDisplay" class="bg-cb-primary-900 rounded px-3 py-1.5">
				<div class="flex items-center space-x-2">
					<UIcon name="i-heroicons-calendar-days" class="h-4 w-4 text-white" />
					<p class="text-sm text-white">
						{{ periodDisplay }}
					</p>
				</div>
			</div>
			<div v-if="loading" class="flex items-center space-x-2">
				<div
					class="border-cb-primary-900 h-4 w-4 animate-spin rounded-full border-b-2"
				></div>
				<span class="text-cb-tertiary-200 text-sm">Chargement...</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
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
