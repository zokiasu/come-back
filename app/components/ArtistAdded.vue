<script setup lang="ts">
	const props = withDefaults(
		defineProps<{
			artists: Array<{
				id: string
				name: string
				type?: string
				image?: string
			}>
			showTitle?: boolean
		}>(),
		{
			showTitle: true,
		},
	)
</script>

<template>
	<div class="space-y-2">
		<p v-if="props.showTitle" class="text-sm font-semibold uppercase">Artist added</p>
		<div
			class="scrollBarLight relative flex w-full snap-x snap-mandatory justify-between gap-5 overflow-x-auto pb-5"
		>
			<CardObject
				v-for="artist in props.artists"
				:key="artist.id"
				is-artist
				:artist-id="artist.id"
				:main-title="artist.name"
				:sub-title="artist.type ?? undefined"
				:image="artist.image ?? undefined"
				:object-link="`/artist/${artist.id}`"
				class="snap-start"
			/>
		</div>
	</div>
</template>
