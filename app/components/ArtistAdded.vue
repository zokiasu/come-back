<script setup lang="ts">
	const props = defineProps<{
		artists: Array<{
			id: string
			name: string
			type?: string | null
			image?: string | null
		}>
	}>()
</script>

<template>
	<CardDefault name="Artist added">
		<div
			class="scrollBarLight relative flex w-full snap-x snap-mandatory justify-between gap-5 overflow-x-auto pb-5"
		>
			<CardObject
				v-for="artist in props.artists"
				:key="artist.id"
				is-artist
				:artist-id="artist.id"
				:main-title="artist.name"
				:sub-title="artist.type"
				:image="artist.image"
				:object-link="`/artist/${artist.id}`"
				class="snap-start"
			/>
		</div>
	</CardDefault>
</template>
