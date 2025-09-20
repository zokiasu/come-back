<script setup lang="ts">
	import type { PropType } from 'vue'
	import type { Music } from '~/types'

	const props = defineProps({
		mvs: {
			type: Array as PropType<Music[]>,
			default: () => [],
		},
	})

	// État local pour le MV actuellement sélectionné
	const currentMVIndex = ref(0)
	const hoveredMVIndex = ref<number | null>(null)
	const imageLoaded = ref(false)
	const isPlaying = ref(false)
	const showThumbnail = ref(true)
	const player = ref(null)
	const playerContainer = useTemplateRef('playerContainer')
	const isPlayerReady = ref(false)

	// MV actuellement affiché
	const currentMV = computed(() => props.mvs[currentMVIndex.value])

	// MV pour les infos (hover ou current)
	const displayedMV = computed(() =>
		hoveredMVIndex.value !== null ? props.mvs[hoveredMVIndex.value] : currentMV.value,
	)

	// Fonctions pour changer de MV
	const selectMV = async (index: number) => {
		if (index === currentMVIndex.value) return

		currentMVIndex.value = index
		imageLoaded.value = false

		// Si le player existe, arrêter la vidéo actuelle
		if (player.value && isPlayerReady.value) {
			player.value.stopVideo()
		}

		// Lancer directement la nouvelle vidéo
		const newMV = props.mvs[index]
		if (newMV?.id_youtube_music) {
			showThumbnail.value = false
			await nextTick()
			createYouTubePlayer(newMV.id_youtube_music)
		}
	}

	// Fonctions pour le survol
	const onThumbnailHover = (index: number) => {
		hoveredMVIndex.value = index
	}

	const onThumbnailLeave = () => {
		hoveredMVIndex.value = null
	}

	// Charger l'API YouTube
	const loadYouTubeAPI = () => {
		return new Promise<void>((resolve, reject) => {
			console.log('🔍 Checking if YouTube API is available...')

			if (window.YT && window.YT.Player) {
				console.log('✅ YouTube API already loaded')
				resolve()
				return
			}

			console.log('📥 Loading YouTube API...')
			const tag = document.createElement('script')
			tag.src = 'https://www.youtube.com/iframe_api'
			const firstScriptTag = document.getElementsByTagName('script')[0]
			firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

			// Créer un callback sécurisé pour éviter la pollution globale
			const originalCallback = window.onYouTubeIframeAPIReady
			const callbackHandler = () => {
				console.log('✅ YouTube API loaded successfully')
				// Restaurer le callback original s'il existait
				if (originalCallback) {
					window.onYouTubeIframeAPIReady = originalCallback
				} else {
					delete window.onYouTubeIframeAPIReady
				}
				resolve()
			}

			// Si l'API est déjà prête, exécuter directement
			if (window.onYouTubeIframeAPIReady) {
				window.onYouTubeIframeAPIReady()
			} else {
				window.onYouTubeIframeAPIReady = callbackHandler
			}

			tag.onerror = () => {
				console.error('❌ Failed to load YouTube API')
				reject(new Error('Failed to load YouTube API'))
			}

			// Timeout de 10 secondes
			setTimeout(() => {
				if (!window.YT || !window.YT.Player) {
					console.error('❌ YouTube API load timeout')
					reject(new Error('YouTube API load timeout'))
				}
			}, 10000)
		})
	}

	// Créer le lecteur YouTube
	const createYouTubePlayer = async (videoId: string) => {
		try {
			console.log('🎬 Creating YouTube player for video:', videoId)
			console.log('📍 Player container:', playerContainer.value)

			await loadYouTubeAPI()

			if (player.value) {
				console.log('🗑️ Destroying existing player')
				player.value.destroy()
				player.value = null
			}

			if (!playerContainer.value) {
				console.error('❌ Player container not found')
				return
			}

			// Générer un ID unique pour éviter les conflits
			const playerId = 'youtube-player-' + Date.now()
			playerContainer.value.id = playerId

			console.log('🎥 Initializing YouTube Player with ID:', playerId)

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
					onReady: (event: any) => {
						console.log('✅ YouTube player ready')
						isPlayerReady.value = true
						isPlaying.value = true
					},
					onStateChange: (event: any) => {
						console.log('🔄 Player state changed:', event.data)
						if (event.data === window.YT.PlayerState.ENDED) {
							console.log('⏹️ Video ended')
							showThumbnail.value = true
							isPlaying.value = false
						} else if (event.data === window.YT.PlayerState.PLAYING) {
							console.log('▶️ Video playing')
							isPlaying.value = true
						} else if (event.data === window.YT.PlayerState.PAUSED) {
							console.log('⏸️ Video paused')
							isPlaying.value = false
						}
					},
					onError: (event: any) => {
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

	// Lancer la vidéo
	const playCurrentMV = async () => {
		console.log('🎯 Play button clicked')
		console.log('📹 Current MV:', currentMV.value)
		console.log('🎬 Video ID:', currentMV.value?.id_youtube_music)
		console.log('📱 Is playing:', isPlaying.value)
		console.log('🖼️ Show thumbnail:', showThumbnail.value)

		if (!currentMV.value?.id_youtube_music) {
			console.error('❌ No video ID found')
			return
		}

		if (isPlaying.value) {
			console.log('⚠️ Already playing')
			return
		}

		// D'abord basculer vers le mode vidéo pour que le container soit disponible
		showThumbnail.value = false

		// Attendre que le DOM se mette à jour
		await nextTick()
		console.log('📍 Player container after nextTick:', playerContainer.value)

		createYouTubePlayer(currentMV.value.id_youtube_music)
	}

	// Arrêter la vidéo et revenir au thumbnail
	const stopVideo = () => {
		if (player.value && isPlayerReady.value) {
			player.value.stopVideo()
		}
		showThumbnail.value = true
		isPlaying.value = false
	}

	// Format artist names
	const formatArtists = (artists: any[]) => {
		return artists?.map((artist) => artist.name).join(', ') || ''
	}

	// Générer les URLs des thumbnails YouTube
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

	// Thumbnail principale (haute qualité)
	const getMainThumbnail = (videoId: string) => {
		return getYouTubeThumbnail(videoId, 'maxresdefault')
	}

	// Thumbnail pour navigation (qualité moyenne)
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

	// Nettoyage à la destruction du composant
	onUnmounted(() => {
		if (player.value) {
			player.value.destroy()
		}
	})
</script>

<template>
	<div v-if="mvs.length > 0" class="space-y-4">
		<!-- Main Video Player -->
		<div class="relative">
			<!-- Thumbnail (affiché quand pas en lecture) -->
			<UButton
				v-if="currentMV && showThumbnail"
				class="bg-cb-quinary-900 text-cb-tertiary-200 hover:text-cb-primary-900 relative aspect-video w-full overflow-hidden rounded-lg !p-0 drop-shadow-lg"
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
							class="hover:text-cb-primary-900 text-xl font-bold lg:text-2xl"
						>
							{{ currentMV.name }}
						</h3>
						<p v-if="currentMV.artists && currentMV.artists.length > 0" class="text-lg">
							{{ formatArtists(currentMV.artists) }}
						</p>
					</div>
					<div class="flex justify-end">
						<div class="bg-cb-quinary-900/80 rounded-full p-3 backdrop-blur-sm">
							<IconPlay class="h-8 w-8 md:h-10 md:w-10" />
						</div>
					</div>
				</div>
			</UButton>

			<!-- Lecteur YouTube (affiché pendant la lecture) -->
			<div
				v-if="!showThumbnail"
				class="relative aspect-video w-full overflow-hidden rounded-lg drop-shadow-lg"
			>
				<div ref="playerContainer" class="h-full w-full"></div>
				<!-- Bouton stop -->
				<button
					class="absolute top-4 right-4 rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"
					title="Stop video"
					@click="stopVideo"
				>
					<UIcon name="i-heroicons-x-mark-20-solid" class="h-4 w-4 text-white" />
				</button>
			</div>
		</div>

		<!-- Thumbnails Navigation -->
		<div class="flex space-x-3 overflow-x-auto p-1 pb-2">
			<button
				v-for="(mv, index) in mvs"
				:key="mv.id"
				class="relative flex-shrink-0 cursor-pointer overflow-hidden rounded-lg transition-all duration-200 hover:scale-105"
				:class="[
					index === currentMVIndex
						? 'ring-cb-primary-500 ring-2'
						: 'hover:ring-cb-primary-300 hover:ring-2',
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
						<IconPlay class="text-cb-tertiary-400 h-4 w-4" />
					</div>
				</div>
				<!-- Overlay for active state -->
				<div
					v-if="index !== currentMVIndex"
					class="bg-cb-quinary-900/50 absolute inset-0 flex items-center justify-center"
				>
					<IconPlay class="h-3 w-3 text-white md:h-4 md:w-4" />
				</div>
			</button>
		</div>

		<!-- MV Info -->
		<div v-if="displayedMV" class="space-y-1 text-center transition-all duration-200">
			<p class="text-cb-tertiary-400 text-sm">
				{{ formatArtists(displayedMV.artists) }}
			</p>
			<h4 class="text-lg font-semibold">{{ displayedMV.name }}</h4>
			<p v-if="displayedMV.date" class="text-cb-tertiary-500 text-xs">
				Released: {{ new Date(displayedMV.date).toLocaleDateString() }}
			</p>
			<!-- Indicateur de survol -->
			<div
				class="text-cb-primary-400 text-xs italic"
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

	<!-- Loading State -->
	<div v-else class="space-y-4">
		<SkeletonDefault class="aspect-video w-full rounded-lg" />
		<div class="flex space-x-3">
			<SkeletonDefault
				v-for="i in 7"
				:key="i"
				class="aspect-video w-20 flex-shrink-0 rounded-lg md:w-24"
			/>
		</div>
	</div>
</template>
