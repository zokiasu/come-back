<script setup lang="ts">
	import type { Release } from '~/types'

	const props = withDefaults(
		defineProps<{
			releases: Release[]
			showTitle?: boolean
		}>(),
		{
			showTitle: true,
		},
	)
</script>
<template>
	<div class="space-y-2">
		<p v-if="props.showTitle" class="text-sm font-semibold uppercase">Recent Releases</p>
		<div
			class="scrollBarLight relative flex w-full snap-x snap-mandatory justify-between gap-5 overflow-x-auto pb-5"
		>
			<CardObject
				v-for="release in props.releases"
				:key="release.id_youtube_music ?? release.id"
				:artist-id="release.artists?.[0]?.id ?? 'index'"
				:main-title="release.name"
				:sub-title="
					release.artists
						? release.artists.map((artist) => artist.name).join(', ')
						: 'Unknown'
				"
				:image="release.image ?? undefined"
				:release-date="release.date ?? undefined"
				:release-type="release.type ?? undefined"
				:object-link="`/release/${release.id}`"
			/>
		</div>
	</div>
</template>
