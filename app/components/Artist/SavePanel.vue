<script setup lang="ts">
	defineProps<{
		description: string
	}>()
</script>

<template>
	<ArtistFormPanel title="Save panel" :description="description">
		<div class="space-y-3">
			<slot />
		</div>
	</ArtistFormPanel>
</template>
