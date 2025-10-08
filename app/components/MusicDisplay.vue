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

	const displayVideo = ref(false)

	const { addToPlaylist } = useYouTube()

	const playVideo = (videoId: string) => {
		const mainArtistName =
			artists && artists.length > 0 ? artists[0]?.name : artistName || ''

		addToPlaylist(videoId, musicName, mainArtistName)
	}

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
		<button
			v-if="musicId"
			:disabled="idYoutubeVideo == musicId"
			class="bg-cb-quaternary-950 col-span-1 flex w-full cursor-pointer items-center gap-2 rounded p-2 px-3"
			:class="{
				'group hover:bg-cb-tertiary-200/10': idYoutubeVideo != musicId,
				'col-span-4': ismv && horizontalMode,
			}"
			@click="playVideo(musicId)"
		>
			<div class="hidden shrink-0 md:block">
				<NuxtImg
					v-if="musicImage != null || musicImage != undefined"
					format="webp"
					:alt="musicName"
					:src="musicImage"
					class="shadow-cb-secondary-950 h-10 w-10 rounded shadow"
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
							>
								{{ releases[0]?.name }}
							</NuxtLink>
							<span class="hidden md:block">-</span>
							<span class="hidden whitespace-nowrap md:block">
								{{
									releases[0]?.date
										? new Date(releases[0].date).toLocaleDateString('fr-FR')
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
					>
						{{ albumName }}
					</NuxtLink>
				</div>
			</div>

			<div class="flex w-10 shrink-0 justify-center">
				<IconPlay
					v-if="idYoutubeVideo != musicId"
					class="h-10 w-10 transition-all duration-300 ease-in-out"
				/>
				<IconPause v-else class="h-10 w-10 transition-all duration-300 ease-in-out" />
			</div>
		</button>

		<button
			v-if="ismv"
			class="bg-cb-primary-900 hover:bg-cb-primary-900/50 flex w-full items-center justify-center rounded px-2 py-1 text-xs font-semibold tracking-widest uppercase"
			:class="horizontalMode ? 'w-fit' : 'w-full'"
			@click="displayVideo = true"
		>
			<p class="hidden lg:block">Music Video</p>
			<p class="lg:hidden">M/V</p>
		</button>

		<div
			v-if="displayVideo && ismv"
			class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/80 lg:gap-10"
			@click="displayVideo = false"
		>
			<iframe
				class="aspect-video w-full md:w-[80%] lg:w-[60%]"
				:src="`https://www.youtube.com/embed/` + musicId"
				:title="musicName + ' M/V'"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				referrerpolicy="strict-origin-when-cross-origin"
				allowfullscreen
			></iframe>

			<p class="text-cb-tertiary-200/80 hover:text-cb-tertiary-200 cursor-pointer">
				Close M/V
			</p>
		</div>
	</div>
</template>
