<script setup lang="ts">
	import type { PropType } from 'vue'
	import type { Artist, Release } from '~/types'

	const {
		musicName,
		musicId,
		duration,
		artistName,
		artistId,
		artistImage,
		albumName,
		albumId,
		musicImage,
		ismv,
		horizontalMode,
		artists,
		releases,
	} = defineProps({
		artists: {
			type: Array as PropType<Artist[]>,
		},
		releases: {
			type: Array as PropType<Release[]>,
		},
		artistName: {
			type: String,
		},
		artistId: {
			type: String,
		},
		albumId: {
			type: String,
		},
		albumName: {
			type: String,
		},
		duration: {
			type: [String, Number],
		},
		artistImage: {
			type: String,
		},
		musicName: {
			type: String,
			required: true,
		},
		musicImage: {
			type: String,
			required: true,
		},
		musicId: {
			type: String,
			required: true,
		},
		musicDate: {
			type: String,
		},
		ismv: {
			type: Boolean,
		},
		horizontalMode: {
			type: Boolean,
		},
	})

	const idYoutubeVideo = useIdYoutubeVideo()
	const isPlayingVideo = useIsPlayingVideo()
	const fallbackMusicImage = '/slider-placeholder.webp'

	const displayVideo = ref(false)
	const hasMusicImageError = ref(false)

	const resolvedMusicImage = computed(() => {
		if (hasMusicImageError.value) return fallbackMusicImage
		if (typeof musicImage === 'string' && musicImage.trim().length > 0) return musicImage
		return fallbackMusicImage
	})

	const { addToPlaylist, playNow, stopMusic, isCurrentlyPlaying } = useYouTube()
	const { isPlaylistActive } = usePlaylist()

	const primaryArtistName = computed(() => {
		if (artists && artists.length > 0) return artists[0]?.name || ''
		return artistName || ''
	})

	const hasActivePlayback = computed(() => isPlayingVideo.value || isPlaylistActive.value)
	const isCurrentTrackPlaying = computed(() => isCurrentlyPlaying(musicId))

	const primaryActionLabel = computed(() => {
		if (isCurrentTrackPlaying.value) return `Stop ${musicName}`
		if (hasActivePlayback.value) return `Play ${musicName} now`
		return `Play ${musicName}`
	})

	const handlePlayMusic = () => {
		if (!musicId) return

		if (isCurrentTrackPlaying.value) {
			stopMusic()
			return
		}

		playNow(musicId, musicName, primaryArtistName.value, resolvedMusicImage.value, ismv)
	}

	const handleQueueMusic = () => {
		if (!musicId) return

		addToPlaylist(
			musicId,
			musicName,
			primaryArtistName.value,
			resolvedMusicImage.value,
			ismv,
		)
	}

	const onMusicImageError = () => {
		hasMusicImageError.value = true
	}

	watch(
		() => musicImage,
		() => {
			hasMusicImageError.value = false
		},
	)

	const convertDuration = (duration: string | number) => {
		const durationNumber = typeof duration === 'string' ? parseInt(duration) : duration
		const minutes = Math.floor(durationNumber / 60)
		const seconds = durationNumber % 60
		if (seconds < 10) return `${minutes}:0${seconds}`
		return `${minutes}:${seconds}`
	}
</script>

<template>
	<div
		class="grid w-full bg-transparent"
		:class="ismv && horizontalMode ? 'grid-cols-5 gap-2' : 'grid-cols-1 gap-0.5'"
	>
		<div
			v-if="musicId"
			class="bg-cb-quaternary-950 col-span-1 flex w-full items-center gap-3 rounded p-2 px-3"
			:class="{
				'ring-cb-primary-900/40 ring-1': idYoutubeVideo === musicId,
				'col-span-4': ismv && horizontalMode,
			}"
		>
			<div class="hidden shrink-0 md:block">
				<NuxtImg
					format="webp"
					:alt="musicName"
					:src="resolvedMusicImage"
					class="shadow-cb-secondary-950 h-10 w-10 rounded shadow"
					@error="onMusicImageError"
				/>
			</div>

			<div class="min-w-0 flex-1 overflow-hidden">
				<div v-if="musicName">
					<p class="flex w-full items-center gap-2 text-start">
						<span class="truncate text-sm font-semibold">
							{{ musicName }}
						</span>
						<span class="hidden md:block">-</span>
						<span class="hidden text-right md:block">
							{{ convertDuration(duration ?? 0) }}
						</span>
					</p>
					<div class="flex items-center gap-1 text-xs">
						<template v-if="artists && artists.length > 0">
							<div
								v-for="artist in artists"
								:key="artist.id"
								class="flex items-center gap-1 text-xs"
							>
								<NuxtImg
									v-if="artist.image"
									format="webp"
									:alt="artist.name"
									:src="artist.image"
									class="shadow-cb-secondary-950 size-3 rounded-full object-cover shadow"
								/>
								<NuxtLink
									:to="`/artist/${artist.id}`"
									class="whitespace-nowrap hover:underline"
									@click.stop
								>
									{{ artist.name }}
								</NuxtLink>
								<p v-if="artists.length > 1" class="text-cb-tertiary-500">-</p>
							</div>
						</template>
						<p v-if="releases && releases.length > 0 && artists && artists.length > 0">
							-
						</p>
						<div v-if="releases && releases.length > 0" class="flex items-center gap-1">
							<NuxtLink
								:to="`/release/${releases[0]?.id}`"
								class="hidden whitespace-nowrap hover:underline md:block"
								@click.stop
							>
								{{ releases[0]?.name }}
							</NuxtLink>
							<span class="hidden md:block">-</span>
							<span class="hidden whitespace-nowrap md:block">
								{{
									releases[0]?.date
										? new Date(releases[0].date).toLocaleDateString('sv-SE')
										: ''
								}}
							</span>
						</div>
					</div>
				</div>

				<div
					v-else-if="artistName || albumId"
					class="flex min-w-0 items-center gap-2 overflow-hidden text-xs"
				>
					<NuxtImg
						v-if="artistImage"
						format="webp"
						:alt="artistName"
						:src="artistImage"
						class="shadow-cb-secondary-950 h-3 w-3 rounded-full object-cover shadow"
					/>
					<NuxtLink
						v-if="artistName && artistId"
						:to="`/artist/${artistId}`"
						class="whitespace-nowrap hover:underline"
						@click.stop
					>
						{{ artistName }}
					</NuxtLink>
					<p v-if="artistName && !artistId" class="whitespace-nowrap">
						{{ artistName }}
					</p>
					<p v-if="albumId" class="truncate text-xs md:block">-</p>
					<NuxtLink
						v-if="albumId"
						:to="`/release/${albumId}`"
						class="truncate text-xs hover:underline md:block"
						@click.stop
					>
						{{ albumName }}
					</NuxtLink>
				</div>
			</div>

			<div class="flex shrink-0 items-center gap-2">
				<button
					type="button"
					class="flex size-8 cursor-pointer items-center justify-center rounded-full text-white transition-colors md:size-9"
					:class="
						isCurrentTrackPlaying
							? 'bg-cb-primary-900'
							: 'bg-cb-quinary-900 hover:bg-cb-primary-900'
					"
					:aria-label="primaryActionLabel"
					@click.stop="handlePlayMusic"
				>
					<UIcon
						:name="isCurrentTrackPlaying ? 'i-lucide-pause' : 'i-lucide-play'"
						class="size-4"
					/>
				</button>

				<button
					v-if="hasActivePlayback"
					type="button"
					class="bg-cb-quinary-900 hover:bg-cb-primary-900 flex size-8 cursor-pointer items-center justify-center rounded-full text-white transition-colors md:size-9"
					:aria-label="`Add ${musicName} to playlist`"
					@click.stop="handleQueueMusic"
				>
					<UIcon name="i-lucide-plus" class="size-4" />
				</button>
			</div>
		</div>

		<button
			v-if="ismv"
			class="bg-cb-primary-900 hover:bg-cb-primary-900/50 flex w-full cursor-pointer items-center justify-center rounded px-2 py-1 text-xs font-semibold tracking-widest uppercase"
			:class="horizontalMode ? 'w-fit' : 'w-full'"
			@click="displayVideo = true"
		>
			<p class="hidden lg:block">Music Video</p>
			<p class="lg:hidden">M/V</p>
		</button>

		<ModalMvPreview v-model:open="displayVideo" :video-id="musicId" :title="musicName" />
	</div>
</template>
