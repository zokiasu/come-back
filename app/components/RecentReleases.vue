<script setup lang="ts">
	import type { Release } from '~/types'

	const { releases } = defineProps<{
		releases: Release[]
	}>()
</script>
<template>
	<CardDefault name="Recent Releases">
		<div
			class="scrollBarLight relative flex w-full snap-x snap-mandatory justify-between gap-5 overflow-x-auto pb-5"
		>
			<CardObject
				v-for="release in releases"
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
	</CardDefault>
</template>
