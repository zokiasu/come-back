<script setup lang="ts">
	import type { PropType } from 'vue'
	import type { Music } from '~/types'

	const props = defineProps({
		mvs: {
			type: Array as PropType<Music[]>,
			default: () => [],
		},
	})

	// Local state for the selected music video
	const currentMVIndex = ref(0)
	const hoveredMVIndex = ref<number | null>(null)
	const imageLoaded = ref(false)
	const isPlaying = ref(false)
	const showThumbnail = ref(true)
	const isThumbsScrolling = ref(false)
	let thumbsScrollTimeout: ReturnType<typeof setTimeout> | null = null
	// @ts-expect-error - YT namespace from YouTube IFrame API
	const player = ref<YT.Player | null>(null)
	const playerContainer = useTemplateRef('playerContainer')
	const isPlayerReady = ref(false)

	// Currently displayed music video
	const currentMV = computed(() => props.mvs[currentMVIndex.value])

	// Music video used for details (hovered or current)
	const displayedMV = computed(() =>
		hoveredMVIndex.value !== null ? props.mvs[hoveredMVIndex.value] : currentMV.value,
	)

	// Handlers to switch the selected music video
	const selectMV = async (index: number) => {
		if (index === currentMVIndex.value) return

		currentMVIndex.value = index
		imageLoaded.value = false

		// Stop the current video if the player already exists
		if (player.value && isPlayerReady.value) {
			player.value.stopVideo()
		}

		// Start the new video immediately
		const newMV = props.mvs[index]
		if (newMV?.id_youtube_music) {
			showThumbnail.value = false
			await nextTick()
			createYouTubePlayer(newMV.id_youtube_music)
		}
	}

	// Hover handlers
	const onThumbnailHover = (index: number) => {
		hoveredMVIndex.value = index
	}

	const onThumbnailLeave = () => {
		hoveredMVIndex.value = null
	}

	const onThumbsScroll = () => {
		isThumbsScrolling.value = true
		if (thumbsScrollTimeout) clearTimeout(thumbsScrollTimeout)
		thumbsScrollTimeout = setTimeout(() => {
			isThumbsScrolling.value = false
		}, 700)
	}

	// Load the YouTube API
	const loadYouTubeAPI = () => {
		return new Promise<void>((resolve, reject) => {
			console.warn('🔍 Checking if YouTube API is available...')

			if (window.YT && window.YT.Player) {
				console.warn('✅ YouTube API already loaded')
				resolve()
				return
			}

			console.warn('📥 Loading YouTube API...')
			const tag = document.createElement('script')
			tag.src = 'https://www.youtube.com/iframe_api'
			const firstScriptTag = document.getElementsByTagName('script')[0]
			if (firstScriptTag?.parentNode) {
				firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
			}

			// Use a scoped callback to avoid leaking a global handler
			const originalCallback = window.onYouTubeIframeAPIReady
			const callbackHandler = () => {
				console.warn('✅ YouTube API loaded successfully')
				// Restore the original callback when one already exists
				if (originalCallback) {
					window.onYouTubeIframeAPIReady = originalCallback
				} else {
					delete window.onYouTubeIframeAPIReady
				}
				resolve()
			}

			// Run immediately if the API is already ready
			if (window.onYouTubeIframeAPIReady) {
				window.onYouTubeIframeAPIReady()
			} else {
				window.onYouTubeIframeAPIReady = callbackHandler
			}

			tag.onerror = () => {
				console.error('❌ Failed to load YouTube API')
				reject(new Error('Failed to load YouTube API'))
			}

			// Abort after 10 seconds
			setTimeout(() => {
				if (!window.YT || !window.YT.Player) {
					console.error('❌ YouTube API load timeout')
					reject(new Error('YouTube API load timeout'))
				}
			}, 10000)
		})
	}

	// Create the YouTube player
	const createYouTubePlayer = async (videoId: string) => {
		try {
			console.warn('🎬 Creating YouTube player for video:', videoId)
			console.warn('📍 Player container:', playerContainer.value)

			await loadYouTubeAPI()

			if (player.value) {
				console.warn('🗑️ Destroying existing player')
				player.value.destroy()
				player.value = null
			}

			if (!playerContainer.value) {
				console.error('❌ Player container not found')
				return
			}

			// Generate a unique ID to avoid collisions
			const playerId = 'youtube-player-' + Date.now()
			playerContainer.value.id = playerId

			console.warn('🎥 Initializing YouTube Player with ID:', playerId)

			player.value = new window.YT.Player(playerId, {
				videoId: videoId,
				height: '100%',
				width: '100%',
				playerVars: {
					autoplay: 1,
					controls: 1,
					rel: 0,
					showinfo: 0,
					modestbranding: 1,
					playsinline: 1,
					origin: import.meta.client ? window.location.origin : 'https://localhost',
				},
				events: {
					// @ts-expect-error - YT namespace from YouTube IFrame API
					onReady: (_event: YT.PlayerEvent) => {
						console.warn('✅ YouTube player ready')
						isPlayerReady.value = true
						isPlaying.value = true
					},
					// @ts-expect-error - YT namespace from YouTube IFrame API
					onStateChange: (event: YT.OnStateChangeEvent) => {
						console.warn('🔄 Player state changed:', event.data)
						if (event.data === window.YT.PlayerState.ENDED) {
							console.warn('⏹️ Video ended')
							showThumbnail.value = true
							isPlaying.value = false
						} else if (event.data === window.YT.PlayerState.PLAYING) {
							console.warn('▶️ Video playing')
							isPlaying.value = true
						} else if (event.data === window.YT.PlayerState.PAUSED) {
							console.warn('⏸️ Video paused')
							isPlaying.value = false
						}
					},
					onError: (event: { data?: unknown }) => {
						console.error('❌ YouTube player error:', event.data)
						showThumbnail.value = true
						isPlaying.value = false
					},
				},
			})
		} catch (error) {
			console.error('❌ Error creating YouTube player:', error)
			showThumbnail.value = true
			isPlaying.value = false
		}
	}

	// Start the video
	const playCurrentMV = async () => {
		console.warn('🎯 Play button clicked')
		console.warn('📹 Current MV:', currentMV.value)
		console.warn('🎬 Video ID:', currentMV.value?.id_youtube_music)
		console.warn('📱 Is playing:', isPlaying.value)
		console.warn('🖼️ Show thumbnail:', showThumbnail.value)

		if (!currentMV.value?.id_youtube_music) {
			console.error('❌ No video ID found')
			return
		}

		if (isPlaying.value) {
			console.warn('⚠️ Already playing')
			return
		}

		// Switch to video mode first so the container exists
		showThumbnail.value = false

		// Wait for the DOM to update
		await nextTick()
		console.warn('📍 Player container after nextTick:', playerContainer.value)

		createYouTubePlayer(currentMV.value.id_youtube_music)
	}

	// Stop the video and switch back to the thumbnail
	const stopVideo = () => {
		if (player.value && isPlayerReady.value) {
			player.value.stopVideo()
		}
		showThumbnail.value = true
		isPlaying.value = false
	}

	// Format artist names
	const formatArtists = (artists: Array<{ name?: string }>) => {
		return artists?.map((artist) => artist.name).join(', ') || ''
	}

	// Generate YouTube thumbnail URLs
	const getYouTubeThumbnail = (
		videoId: string,
		quality:
			| 'default'
			| 'mqdefault'
			| 'hqdefault'
			| 'sddefault'
			| 'maxresdefault' = 'hqdefault',
	) => {
		return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
	}

	// Primary thumbnail (high quality)
	const getMainThumbnail = (videoId: string) => {
		return getYouTubeThumbnail(videoId, 'maxresdefault')
	}

	// Navigation thumbnail (medium quality)
	const getNavThumbnail = (videoId: string) => {
		return getYouTubeThumbnail(videoId, 'mqdefault')
	}

	// Reset index when mvs change
	watch(
		() => props.mvs,
		() => {
			currentMVIndex.value = 0
			hoveredMVIndex.value = null
			imageLoaded.value = false
			showThumbnail.value = true
			isPlaying.value = false
			if (player.value && isPlayerReady.value) {
				player.value.stopVideo()
			}
		},
		{ immediate: true },
	)

	// Clean up on component unmount
	onUnmounted(() => {
		if (player.value) {
			player.value.destroy()
		}
		if (thumbsScrollTimeout) {
			clearTimeout(thumbsScrollTimeout)
		}
	})
</script>

<template>
	<div v-if="mvs.length > 0" class="space-y-4">
		<div class="relative mx-auto w-full max-w-6xl">
			<UButton
				v-if="currentMV && showThumbnail"
				class="group bg-cb-quinary-900 text-cb-tertiary-200 hover:text-cb-tertiary-100 relative aspect-video w-full overflow-hidden rounded-lg !p-0 drop-shadow-lg"
				@click="playCurrentMV"
			>
				<div v-if="currentMV.id_youtube_music" class="relative h-full w-full">
					<div
						class="bg-cb-quinary-900 absolute inset-0 h-full w-full transition-opacity duration-300"
						:class="imageLoaded ? 'opacity-0' : 'opacity-100'"
					/>
					<NuxtImg
						:alt="currentMV.name"
						:src="getMainThumbnail(currentMV.id_youtube_music)"
						class="h-full w-full rounded object-cover"
						@load="imageLoaded = true"
					/>
				</div>
				<div
					class="bg-cb-quinary-900/70 absolute inset-0 flex flex-col justify-between p-4"
				>
					<div class="space-y-2 text-left">
						<h3
							v-if="currentMV.name"
							class="hover:text-cb-tertiary-100 text-xl font-bold lg:text-2xl"
						>
							{{ currentMV.name }}
						</h3>
						<p v-if="currentMV.artists && currentMV.artists.length > 0" class="text-lg">
							{{ formatArtists(currentMV.artists) }}
						</p>
					</div>
					<div class="flex justify-end">
						<div
							class="bg-cb-quinary-900/80 group-hover:bg-cb-primary-900 flex size-14 items-center justify-center rounded-full backdrop-blur-sm transition-colors duration-200 md:size-16"
						>
							<UIcon
								name="i-lucide-play"
								class="size-6 translate-x-px text-white md:size-7"
							/>
						</div>
					</div>
				</div>
			</UButton>

			<div
				v-if="!showThumbnail"
				class="relative aspect-video w-full overflow-hidden rounded-lg drop-shadow-lg"
			>
				<div ref="playerContainer" class="h-full w-full"></div>
				<button
					class="absolute top-4 right-4 rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"
					title="Stop video"
					@click="stopVideo"
				>
					<UIcon name="i-lucide-x" class="h-4 w-4 text-white" />
				</button>
			</div>
		</div>

		<div
			class="scrollBarLight flex justify-start gap-3 overflow-x-auto p-1 pb-1"
			:class="{ 'is-scrolling': isThumbsScrolling }"
			@scroll.passive="onThumbsScroll"
		>
			<button
				v-for="(mv, index) in mvs"
				:key="mv.id"
				class="relative flex-shrink-0 cursor-pointer overflow-hidden rounded-lg transition-all duration-200 hover:scale-105"
				:class="[
					index === currentMVIndex
						? 'ring-cb-tertiary-400 ring-2'
						: 'hover:ring-cb-tertiary-300 hover:ring-2',
				]"
				@click="selectMV(index)"
				@mouseenter="onThumbnailHover(index)"
				@mouseleave="onThumbnailLeave"
			>
				<div class="aspect-video w-20 md:w-24">
					<NuxtImg
						v-if="mv.id_youtube_music"
						:alt="mv.name"
						:src="getNavThumbnail(mv.id_youtube_music)"
						class="h-full w-full object-cover"
					/>
					<div
						v-else
						class="bg-cb-quinary-900 flex h-full w-full items-center justify-center"
					>
						<UIcon name="i-lucide-play" class="text-cb-tertiary-400 h-4 w-4" />
					</div>
				</div>
				<div
					v-if="index !== currentMVIndex"
					class="bg-cb-quinary-900/50 absolute inset-0 flex items-center justify-center"
				>
					<UIcon name="i-lucide-play" class="h-3 w-3 text-white md:h-4 md:w-4" />
				</div>
			</button>
		</div>

		<div
			v-if="displayedMV"
			class="min-h-[5.5rem] space-y-1 text-center transition-all duration-200"
		>
			<p class="text-cb-tertiary-400 min-h-[1.25rem] text-sm">
				{{ formatArtists(displayedMV.artists || []) }}
			</p>
			<h4 class="min-h-[1.75rem] text-lg font-semibold">
				{{ displayedMV.name }}
			</h4>
			<p v-if="displayedMV.date" class="text-cb-tertiary-500 min-h-[1rem] text-xs">
				Released: {{ new Date(displayedMV.date).toLocaleDateString('sv-SE') }}
			</p>
			<div
				class="text-cb-tertiary-400 text-xs italic"
				:class="
					hoveredMVIndex !== null && hoveredMVIndex !== currentMVIndex
						? 'opacity-100'
						: 'opacity-0'
				"
			>
				Preview
			</div>
		</div>
	</div>

	<div v-else class="space-y-4">
		<SkeletonDefault class="aspect-video w-full rounded-lg" />
		<div
			class="scrollBarLight flex space-x-3 overflow-x-auto pb-1"
			:class="{ 'is-scrolling': isThumbsScrolling }"
			@scroll.passive="onThumbsScroll"
		>
			<SkeletonDefault
				v-for="i in 7"
				:key="i"
				class="aspect-video w-20 flex-shrink-0 rounded-lg md:w-24"
			/>
		</div>
	</div>
</template>
