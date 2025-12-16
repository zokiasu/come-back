<script setup lang="ts">
	import type { PropType } from 'vue'
	import type { Music } from '~/types'

	const props = defineProps({
		music: {
			type: Object as PropType<Music>,
			default: null,
		},
	})

	const idYoutubeVideo = useIdYoutubeVideo()
	const isPlayingVideo = useIsPlayingVideo()
	const imageLoaded = ref(false)

	const { addToPlaylist } = useYouTube()

	const playVideo = (videoId: string) => {
		addToPlaylist(videoId, props.music.name, props.music?.artists?.[0]?.name || '')
	}

	const thumbnailUrl = computed(() => {
		if (
			Array.isArray(props.music.thumbnails) &&
			props.music.thumbnails[2] &&
			typeof props.music.thumbnails[2] === 'object' &&
			'url' in props.music.thumbnails[2]
		) {
			return (props.music.thumbnails[2] as { url: string }).url
		}
		return ''
	})
</script>

<template>
	<div v-if="music && music?.artists">
		<UButton
			class="bg-cb-quinary-900 text-cb-tertiary-200 group relative aspect-square max-h-96 w-full overflow-hidden rounded-lg !p-0 drop-shadow-lg"
			@click="playVideo(music.id_youtube_music ?? '')"
		>
			<div
				v-if="Array.isArray(music.thumbnails) && music.thumbnails.length > 0"
				class="relative h-full w-full"
			>
				<div
					class="bg-cb-quinary-900 absolute inset-0 h-full w-full"
					:class="imageLoaded ? 'opacity-0' : 'opacity-100'"
				/>
				<NuxtImg
					v-if="thumbnailUrl"
					:alt="music.name"
					:src="thumbnailUrl"
					class="h-full w-full rounded object-cover"
					@load="imageLoaded = true"
				/>
			</div>
			<div
				class="bg-cb-quinary-900/70 absolute inset-0 flex flex-col justify-between p-2 lg:p-3"
			>
				<div class="space-y-1 text-left">
					<p v-if="music.name" class="font-semibold group-hover:text-cb-primary-900 lg:text-xl">
						{{ music.name }}
					</p>
					<div class="flex flex-wrap items-center gap-1 text-sm">
						<NuxtLink
							v-if="music.artists && music.artists.length > 0"
							:to="'/artist/' + music.artists[0]?.id"
							class="hover:underline"
							@click.stop
						>
							{{ music.artists[0]?.name }}
						</NuxtLink>
						<template v-if="music.releases?.[0]">
							<span class="text-cb-tertiary-500">-</span>
							<NuxtLink
								:to="'/release/' + music.releases[0].id"
								class="text-cb-tertiary-400 truncate hover:underline"
								@click.stop
							>
								{{ music.releases[0].name }}
							</NuxtLink>
						</template>
					</div>
				</div>
				<div class="flex justify-end">
					<IconPause
						v-if="isPlayingVideo && idYoutubeVideo === music.id_youtube_music"
						class="h-8 w-8 md:h-10 md:w-10"
					/>
					<IconPlay v-else class="h-8 w-8 md:h-10 md:w-10" />
				</div>
			</div>
		</UButton>
	</div>
	<SkeletonDefault
		v-else
		class="bg-cb-quinary-900 aspect-square h-full max-h-96 w-full rounded-lg drop-shadow-lg"
	/>
</template>
