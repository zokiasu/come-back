<script setup lang="ts">
	import type { Artist } from '~/types'

	const props = defineProps<{
		artists: Artist[]
		total: number
	}>()

	const stats = computed(() => {
		let solos = 0
		let groups = 0
		let active = 0
		let inactive = 0
		let noDesc = 0
		let noSocials = 0
		let noPlatforms = 0
		let noStyles = 0

		for (const a of props.artists) {
			if (a.type === 'SOLO') solos++
			if (a.type === 'GROUP') groups++
			if (a.active_career) active++
			else inactive++
			if (!a.description) noDesc++
			if (!a.social_links || a.social_links.length === 0) noSocials++
			if (!a.platform_links || a.platform_links.length === 0) noPlatforms++
			if (!a.styles || a.styles.length === 0) noStyles++
		}

		return {
			total: props.total,
			solos,
			groups,
			active,
			inactive,
			incomplete: noDesc + noSocials + noPlatforms + noStyles,
		}
	})
</script>

<template>
	<div class="flex flex-wrap gap-2">
		<div class="bg-cb-quaternary-950 rounded-lg px-3 py-1.5 text-center">
			<p class="text-lg font-bold">{{ stats.total }}</p>
			<p class="text-cb-tertiary-500 text-xs">Total</p>
		</div>
		<div class="rounded-lg bg-blue-900/30 px-3 py-1.5 text-center">
			<p class="text-lg font-bold text-blue-400">{{ stats.solos }}</p>
			<p class="text-xs text-blue-400/70">Solos</p>
		</div>
		<div class="rounded-lg bg-purple-900/30 px-3 py-1.5 text-center">
			<p class="text-lg font-bold text-purple-400">{{ stats.groups }}</p>
			<p class="text-xs text-purple-400/70">Groups</p>
		</div>
		<div class="rounded-lg bg-green-900/30 px-3 py-1.5 text-center">
			<p class="text-lg font-bold text-green-400">{{ stats.active }}</p>
			<p class="text-xs text-green-400/70">Active</p>
		</div>
		<div class="rounded-lg bg-gray-900/30 px-3 py-1.5 text-center">
			<p class="text-lg font-bold text-gray-400">{{ stats.inactive }}</p>
			<p class="text-xs text-gray-400/70">Inactive</p>
		</div>
		<div
			v-if="stats.incomplete > 0"
			class="rounded-lg bg-amber-900/30 px-3 py-1.5 text-center"
		>
			<p class="text-lg font-bold text-amber-400">{{ stats.incomplete }}</p>
			<p class="text-xs text-amber-400/70">Incomplete</p>
		</div>
	</div>
</template>
