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
		musicImageSrcset,
		musicImageSizes,
		musicImageWidth,
		musicImageHeight,
		ismv,
		horizontalMode,
		responsiveArtwork,
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
		musicImageSrcset: {
			type: String,
		},
		musicImageSizes: {
			type: String,
		},
		musicImageWidth: {
			type: Number,
		},
		musicImageHeight: {
			type: Number,
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
		responsiveArtwork: {
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
	const resolvedMusicImageSrcset = computed(() => {
		if (hasMusicImageError.value) return undefined
		return musicImageSrcset || undefined
	})
	const resolvedMusicImageSizes = computed(() => {
		if (!resolvedMusicImageSrcset.value) return undefined
		return musicImageSizes || undefined
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
			class="bg-cb-quaternary-950 col-span-1 flex w-full rounded"
			:class="[
				{
					'ring-cb-primary-900/40 ring-1': idYoutubeVideo === musicId,
					'col-span-4': ismv && horizontalMode,
				},
				responsiveArtwork
					? 'relative aspect-square items-end overflow-hidden md:aspect-auto md:items-center md:gap-3 md:p-2 md:px-3'
					: 'items-center gap-3 p-2 px-3',
			]"
		>
			<div
				class="shrink-0"
				:class="
					responsiveArtwork ? 'absolute inset-0 md:static md:size-10' : 'hidden md:block'
				"
			>
				<img
					v-if="responsiveArtwork"
					:alt="musicName"
					:src="resolvedMusicImage"
					:srcset="resolvedMusicImageSrcset"
					:sizes="resolvedMusicImageSizes"
					:width="musicImageWidth"
					:height="musicImageHeight"
					loading="lazy"
					decoding="async"
					class="shadow-cb-secondary-950 h-full w-full rounded object-cover shadow md:size-10"
					@error="onMusicImageError"
				/>
				<NuxtImg
					v-else
					format="webp"
					:alt="musicName"
					:src="resolvedMusicImage"
					class="shadow-cb-secondary-950 size-10 rounded object-cover shadow"
					@error="onMusicImageError"
				/>
			</div>

			<div
				class="min-w-0 flex-1 overflow-hidden"
				:class="
					responsiveArtwork
						? 'absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pt-8 pb-2 text-white md:static md:bg-none md:p-0'
						: ''
				"
			>
				<div v-if="musicName">
					<p class="flex w-full items-center gap-2 text-start">
						<span
							class="truncate font-semibold"
							:class="responsiveArtwork ? 'text-xs md:text-sm' : 'text-sm'"
						>
							{{ musicName }}
						</span>
						<span class="hidden md:block">-</span>
						<span class="hidden text-right md:block">
							{{ convertDuration(duration ?? 0) }}
						</span>
					</p>
					<div
						:class="
							responsiveArtwork
								? 'hidden items-center gap-1 text-xs md:flex'
								: 'flex items-center gap-1 text-xs'
						"
					>
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

			<button
				v-if="responsiveArtwork"
				type="button"
				class="absolute inset-0 z-20 flex cursor-pointer items-start justify-end rounded p-2 text-white transition-colors hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset md:hidden"
				:aria-label="primaryActionLabel"
				@click.stop="handlePlayMusic"
			>
				<UIcon
					:name="isCurrentTrackPlaying ? 'i-lucide-pause' : 'i-lucide-play'"
					class="bg-cb-primary-900/90 box-content size-4 rounded-full p-2 shadow"
				/>
			</button>

			<div
				class="shrink-0 items-center gap-2"
				:class="responsiveArtwork ? 'hidden md:flex' : 'flex'"
			>
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
			type="button"
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
