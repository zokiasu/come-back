<script setup lang="ts">
	type ArtistOverviewStat = {
		label: string
		value: string
		helper: string
	}

	defineProps<{
		stats: ArtistOverviewStat[]
	}>()
</script>

<template>
	<div class="grid gap-4 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
		<div
			v-for="stat in stats"
			:key="stat.label"
			class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
		>
			<p class="text-cb-quinary-700 text-xs font-semibold tracking-[0.25em] uppercase">
				{{ stat.label }}
			</p>
			<p class="mt-3 text-2xl font-bold">{{ stat.value }}</p>
			<p class="mt-1 text-sm text-gray-400">{{ stat.helper }}</p>
		</div>
	</div>
</template>
