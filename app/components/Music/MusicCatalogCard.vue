<script setup lang="ts">
	import {
		formatMusicArtists,
		formatMusicDate,
		formatMusicDuration,
		getMusicThumbnailUrl,
		type MusicCatalogItem,
	} from '~/utils/musicCatalog'

	defineProps<{
		music: MusicCatalogItem
		isPlaying: boolean
	}>()

	defineEmits<{
		play: [music: MusicCatalogItem]
		preview: [music: MusicCatalogItem]
		queue: [music: MusicCatalogItem]
	}>()
</script>

<template>
	<article class="bg-cb-quinary-900 group relative flex items-center gap-3 rounded p-2">
		<UButton
			v-if="music.id_youtube_music"
			type="button"
			color="neutral"
			variant="ghost"
			:icon="isPlaying ? 'i-lucide-pause' : 'i-lucide-play'"
			:aria-label="isPlaying ? `Pause ${music.name}` : `Play ${music.name}`"
			class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-colors"
			:class="
				isPlaying ? 'bg-cb-primary-900' : 'bg-cb-quaternary-950 hover:bg-cb-primary-900'
			"
			@click.stop="$emit('play', music)"
		/>
		<div v-else class="size-10 shrink-0" />

		<NuxtImg
			:src="getMusicThumbnailUrl(music.thumbnails) || '/slider-placeholder.webp'"
			:alt="music.name"
			class="h-12 w-12 shrink-0 rounded object-cover"
			format="webp"
			loading="lazy"
		/>

		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-medium">{{ music.name }}</p>
			<p class="text-cb-tertiary-500 truncate text-xs">
				{{ formatMusicArtists(music.artists) }}
			</p>
			<div class="mt-1 flex items-center gap-2">
				<span v-if="music.date" class="text-cb-tertiary-400 text-xs">
					{{ formatMusicDate(music.date) }}
				</span>
				<UButton
					v-if="music.ismv && music.id_youtube_music"
					type="button"
					label="MV"
					color="primary"
					variant="link"
					size="xs"
					:aria-label="`Preview the music video for ${music.name}`"
					class="text-cb-primary-900 cursor-pointer p-0 text-xs font-medium"
					@click.stop="$emit('preview', music)"
				/>
				<span v-if="music.duration" class="text-cb-tertiary-500 text-xs">
					{{ formatMusicDuration(music.duration) }}
				</span>
			</div>
		</div>

		<UButton
			v-if="music.id_youtube_music"
			type="button"
			color="neutral"
			variant="ghost"
			icon="i-lucide-plus"
			:aria-label="`Add ${music.name} to playlist`"
			class="bg-cb-quaternary-950 hover:bg-cb-primary-900 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-colors"
			@click.stop="$emit('queue', music)"
		/>
	</article>
</template>
