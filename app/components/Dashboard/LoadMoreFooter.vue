<script setup lang="ts">
	defineProps<{
		loaded: number
		total: number
		loading?: boolean
	}>()

	defineEmits<{
		loadAll: []
	}>()
</script>

<template>
	<div
		v-if="loaded > 0 && loaded < total"
		class="flex flex-col items-center gap-2 text-xs"
	>
		<p class="text-cb-tertiary-500">({{ loaded }} / {{ total }})</p>
		<UButton
			type="button"
			icon="i-lucide-list-plus"
			color="neutral"
			variant="soft"
			size="sm"
			:loading="loading"
			@click="$emit('loadAll')"
		>
			Load all
		</UButton>
	</div>
</template>
