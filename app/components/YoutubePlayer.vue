<script setup lang="ts">
	import { useMediaQuery, useWindowScroll } from '@vueuse/core'
	const idYoutubeVideo = useIdYoutubeVideo()
	const isPlayingVideo = useIsPlayingVideo()
	const musicNamePlaying = useMusicNamePlaying()
	const authorNamePlaying = useAuthorNamePlaying()

	const { skipToNext, skipToPrevious, getPlaylistInfo } = usePlaylist()
	const playlistInfo = computed(() => getPlaylistInfo())
	const showPlaylist = ref(false)
	const isMinimized = ref(false)

	const isPlaying = ref(false)
	const currentTime = ref(0)
	const duration = ref(0)
	const globalPlayerContainer = useTemplateRef('globalPlayerContainer')
	// @ts-expect-error - YT namespace from YouTube IFrame API
	const player = ref<YT.Player | null>(null)
	const volumeOn = ref(true)
	const volume = ref(20)
	const errorDetected = ref(false)
	const errorMessage = ref('')
	const isPlayerReady = ref(false)
	const isSeeking = ref(false)
	const isMobile = useMediaQuery('(max-width: 767px)')
	const { y: scrollY } = useWindowScroll()
	const lastScrollY = ref(0)

	let intervalId: ReturnType<typeof setInterval> | null = null
	let originalConsoleError: typeof console.error | null = null
	let youtubeErrorHandler: ((event: ErrorEvent) => void) | null = null

	// Création du lecteur YouTube
	const createPlayer = () => {
		if (!import.meta.client) return

		console.warn('🎵 Création du lecteur YouTube avec vidéo:', idYoutubeVideo.value)

		try {
			if (import.meta.client && window.YT) {
				player.value = new window.YT.Player('globalPlayerContainer', {
					videoId: idYoutubeVideo.value,
					height: '100%',
					width: '100%',
					playerVars: {
						autoplay: 1,
						controls: 0,
						disablekb: 1,
						enablejsapi: 1,
						fs: 0,
						iv_load_policy: 3,
						modestbranding: 1,
						playsinline: 1,
						rel: 0,
						showinfo: 0,
						origin: import.meta.client
							? window.location.protocol + '//' + window.location.host
							: 'https://localhost',
						widget_referrer: import.meta.client
							? window.location.protocol + '//' + window.location.host
							: 'https://localhost',
					},
					events: {
						onReady: onPlayerReady,
						onStateChange: onPlayerStateChange,
						onError: onPlayerError,
					},
				})
			}
		} catch (error) {
			console.error('❌ Erreur lors de la création du lecteur YouTube:', error)
			errorDetected.value = true
			errorMessage.value = 'Erreur lors du chargement du lecteur'
		}
	}

	// @ts-expect-error - YT namespace from YouTube IFrame API
	const onPlayerReady = async (event: YT.PlayerEvent) => {
		console.warn('✅ Lecteur YouTube prêt')
		isPlayerReady.value = true
		duration.value = event.target.getDuration()
		setVolume(volume.value)
		errorDetected.value = false
		errorMessage.value = ''
	}

	// @ts-expect-error - YT namespace from YouTube IFrame API
	const onPlayerStateChange = (event: YT.OnStateChangeEvent) => {
		if (!import.meta.client) return

		isPlaying.value = event.data === window.YT.PlayerState.PLAYING
		if (isPlaying.value) {
			errorDetected.value = false
			errorMessage.value = ''
			duration.value = player.value?.getDuration()
		}

		// Gestion de la fin de vidéo pour la playlist
		if (event.data === window.YT.PlayerState.ENDED) {
			console.warn('🎵 Fin de vidéo - tentative de lecture suivante')
			const { playNext } = usePlaylist()

			setTimeout(() => {
				const hasPlayedNext = playNext()
				if (!hasPlayedNext) {
					console.warn('🎵 Aucune musique suivante - fin de playlist')
				}
			}, 500)
		}

		// Log des changements d'état pour debug
		const states: Record<number, string> = {
			[-1]: 'non démarré',
			[0]: 'terminé',
			[1]: 'lecture',
			[2]: 'pause',
			[3]: 'mise en mémoire tampon',
			[5]: "vidéo mise en file d'attente",
		}
		console.warn('🎵 État du lecteur:', states[event.data] || event.data)
	}

	// @ts-expect-error - YT namespace from YouTube IFrame API
	const onPlayerError = (event: YT.OnErrorEvent) => {
		console.error('❌ Erreur du lecteur YouTube:', event.data)
		errorDetected.value = true

		switch (event.data) {
			case 2:
				errorMessage.value = 'ID de vidéo invalide'
				break
			case 5:
				errorMessage.value = 'Erreur de lecture HTML5'
				break
			case 100:
				errorMessage.value = 'Vidéo introuvable ou supprimée'
				break
			case 101:
			case 150:
				errorMessage.value = 'Vidéo restreinte ou non disponible dans votre région'
				break
			default:
				errorMessage.value =
					'Erreur de lecture YouTube. Essayez de désactiver votre bloqueur de publicités.'
		}
	}

	// Set up YouTube error filtering (will be cleaned up in onBeforeUnmount)
	const setupYouTubeErrorFiltering = () => {
		if (!import.meta.client) return

		// Filtrer les erreurs postMessage YouTube au niveau global
		youtubeErrorHandler = (event: ErrorEvent) => {
			if (
				event.error &&
				event.error.message &&
				event.error.message.includes('postMessage') &&
				event.error.message.includes('youtube.com')
			) {
				console.warn('🎵 Info: Communication YouTube iframe (normal en développement)')
				event.preventDefault()
				return
			}
		}
		window.addEventListener('error', youtubeErrorHandler)

		// Filtrer aussi les erreurs de console
		originalConsoleError = console.error
		console.error = (...args) => {
			const message = args.join(' ')
			// Filtrer les erreurs postMessage YouTube connues (non critiques)
			if (message.includes('postMessage') && message.includes('youtube.com')) {
				console.warn('🎵 Info: Communication YouTube iframe (normal en localhost)')
				return
			}
			if (originalConsoleError) {
				originalConsoleError.apply(console, args)
			}
		}
	}

	// Clean up YouTube error filtering
	const cleanupYouTubeErrorFiltering = () => {
		if (!import.meta.client) return

		// Remove window error listener
		if (youtubeErrorHandler) {
			window.removeEventListener('error', youtubeErrorHandler)
			youtubeErrorHandler = null
		}

		// Restore original console.error
		if (originalConsoleError) {
			console.error = originalConsoleError
			originalConsoleError = null
		}
	}

	const initYTPlayer = () => {
		if (!import.meta.client) return

		console.warn('🎵 Initialisation du lecteur YouTube...')

		// Détecter les bloqueurs de publicités de manière plus robuste
		const detectAdBlocker = () => {
			if (!import.meta.client) return false

			try {
				// Créer un élément test qui serait bloqué par les ad-blockers
				const testEl = document.createElement('div')
				testEl.innerHTML = '&nbsp;'
				testEl.className = 'adsbox'
				testEl.style.cssText = 'position:absolute;left:-999px;'
				document.body.appendChild(testEl)

				const isBlocked = testEl.offsetHeight === 0
				document.body.removeChild(testEl)

				return isBlocked
			} catch {
				return false
			}
		}

		if (detectAdBlocker()) {
			console.warn('⚠️ Bloqueur de publicités détecté')
			errorDetected.value = true
			errorMessage.value =
				'Bloqueur de publicités détecté - le lecteur peut ne pas fonctionner'
		}

		if (window.YT && window.YT.Player) {
			console.warn('✅ API YouTube déjà chargée')
			createPlayer()
		} else {
			console.warn("📥 Chargement de l'API YouTube...")

			// Vérifier si le script est déjà présent
			const existingScript = document.querySelector(
				'script[src*="youtube.com/iframe_api"]',
			)
			if (existingScript) {
				console.warn('⏳ Script YouTube déjà en cours de chargement...')
				return
			}

			const tag = document.createElement('script')
			tag.src = 'https://www.youtube.com/iframe_api'
			tag.onload = () => {
				console.warn('✅ Script YouTube chargé')
			}
			tag.onerror = (error) => {
				console.error("❌ Erreur lors du chargement de l'API YouTube:", error)
				errorDetected.value = true
				errorMessage.value =
					'Impossible de charger YouTube. Vérifiez votre bloqueur de publicités.'
			}

			const firstScriptTag = document.getElementsByTagName('script')[0]
			if (firstScriptTag && firstScriptTag.parentNode) {
				firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
			} else {
				document.head.appendChild(tag)
			}

			// Callback global pour l'API YouTube avec timeout
			window.onYouTubeIframeAPIReady = () => {
				console.warn('✅ API YouTube prête')
				createPlayer()
			}

			// Timeout de sécurité
			setTimeout(() => {
				if (!window.YT || !window.YT.Player) {
					console.error('❌ Timeout: API YouTube non chargée après 10 secondes')
					errorDetected.value = true
					errorMessage.value = 'Timeout YouTube. Bloqueur de publicités actif ?'
				}
			}, 10000)
		}
	}

	const updateCurrentTime = () => {
		if (!import.meta.client || !player.value || !isPlayerReady.value || isSeeking.value)
			return

		try {
			if (player.value?.getPlayerState() === window.YT.PlayerState.PLAYING) {
				currentTime.value = player.value?.getCurrentTime()
			}
		} catch (error) {
			console.warn('⚠️ Erreur lors de la mise à jour du temps:', error)
		}
	}

	watch(
		idYoutubeVideo,
		(newId) => {
			if (player.value && isPlayerReady.value && newId) {
				console.warn('🔄 Changement de vidéo:', newId)
				try {
					player.value?.loadVideoById(newId)
					if (isPlaying.value) {
						player.value?.playVideo()
					}
				} catch (error) {
					console.error('❌ Erreur lors du changement de vidéo:', error)
					errorDetected.value = true
					errorMessage.value = 'Erreur lors du changement de vidéo'
				}
			}
		},
		{ immediate: true },
	)

	onMounted(() => {
		console.warn('🎵 Montage du composant YoutubePlayer')
		setupYouTubeErrorFiltering()
		initYTPlayer()
		intervalId = setInterval(updateCurrentTime, 1000)
	})

	watch(
		[scrollY, isPlayingVideo, isMobile],
		([y, playing, mobile]) => {
			if (!mobile || !playing) return
			const delta = y - lastScrollY.value
			if (delta > 20) {
				isMinimized.value = true
			} else if (y < 100) {
				isMinimized.value = false
			}
			lastScrollY.value = y
		},
		{ immediate: true },
	)

	onBeforeUnmount(() => {
		console.warn('🎵 Démontage du composant YoutubePlayer')

		if (intervalId) {
			clearInterval(intervalId)
		}

		if (player.value) {
			try {
				player.value?.destroy()
			} catch (error) {
				console.warn('⚠️ Erreur lors de la destruction du lecteur:', error)
			}
		}

		// Clean up YouTube error filtering to prevent memory leaks
		cleanupYouTubeErrorFiltering()
	})

	const togglePlayPause = () => {
		if (!import.meta.client || !player.value || !isPlayerReady.value) return

		try {
			if (isPlaying.value) {
				player.value?.pauseVideo()
			} else {
				player.value?.playVideo()
			}
		} catch (error) {
			console.error('❌ Erreur lors du toggle play/pause:', error)
		}
	}

	const seek = (seconds: number) => {
		if (!import.meta.client || !player.value || !isPlayerReady.value) return

		try {
			const newTime = player.value?.getCurrentTime() + seconds
			player.value?.seekTo(newTime, true)
			currentTime.value = player.value?.getCurrentTime()
		} catch (error) {
			console.error('❌ Erreur lors du seek:', error)
		}
	}

	const onSeekStart = () => {
		isSeeking.value = true
	}

	const onSeekEnd = (newTime: number | undefined) => {
		if (!import.meta.client || !player.value || !isPlayerReady.value) return
		if (newTime === undefined) return

		try {
			player.value?.seekTo(newTime, true)
			currentTime.value = newTime
		} catch (error) {
			console.error('❌ Erreur lors du seekTo:', error)
		} finally {
			isSeeking.value = false
		}
	}

	const setVolume = (newVolume: number | undefined) => {
		if (!import.meta.client || !player.value || !isPlayerReady.value) return
		if (newVolume === undefined) return

		try {
			player.value?.setVolume(newVolume)
			volume.value = newVolume
		} catch (error) {
			console.error('❌ Erreur lors du réglage du volume:', error)
		}
	}

	const muteVolume = () => {
		if (!import.meta.client || !player.value || !isPlayerReady.value) return

		try {
			if (volumeOn.value) {
				player.value?.mute()
				if (isPlaying.value) togglePlayPause()
			} else {
				player.value?.unMute()
				if (!isPlaying.value) togglePlayPause()
			}
			volumeOn.value = !volumeOn.value
		} catch (error) {
			console.error('❌ Erreur lors du mute/unmute:', error)
		}
	}

	const closeYTPlayer = () => {
		console.warn('🎵 Fermeture du lecteur YouTube')
		isPlayingVideo.value = false
		idYoutubeVideo.value = ''

		// Vider la playlist pour permettre de relancer une musique directement
		const { clearPlaylist } = usePlaylist()
		clearPlaylist()

		if (player.value) {
			try {
				player.value?.destroy()
			} catch (error) {
				console.warn('⚠️ Erreur lors de la fermeture:', error)
			}
		}

		// Reset des états
		isPlayerReady.value = false
		errorDetected.value = false
		errorMessage.value = ''
		isPlaying.value = false
		currentTime.value = 0
		duration.value = 0
		isMinimized.value = false
	}

	const convertDuration = (duration: number): string => {
		const minutes = Math.floor(duration / 60)
		const secondsNum = Math.round(duration % 60)

		const seconds = secondsNum < 10 ? `0${secondsNum}` : secondsNum.toString()

		return `${minutes}:${seconds}`
	}

	const toggleMinimize = () => {
		isMinimized.value = !isMinimized.value
	}

	const playerWrapperClass = computed(() => {
		if (isMobile.value) {
			return isMinimized.value
				? 'bottom-24 right-4 w-16'
				: 'bottom-24 inset-x-0 px-4'
		}
		return isMinimized.value ? 'bottom-6 right-6 w-16' : 'bottom-6 inset-x-0 px-6'
	})
</script>

<template>
	<div
		class="fixed z-[1100] flex w-full flex-col items-center justify-center space-y-3 sm:items-end sm:justify-end"
		:class="playerWrapperClass"
	>
		<PlaylistPanel v-model:is-open="showPlaylist" class="min-w-80 lg:mr-3" />

		<div
			id="globalPlayerContainer"
			ref="globalPlayerContainer"
			class="hidden aspect-video w-1/4 min-w-[20rem] overflow-hidden rounded-lg px-2 lg:absolute lg:-top-72 lg:right-0 lg:z-50 lg:h-72"
		></div>

		<div
			v-if="!isMinimized"
			class="bg-cb-secondary-950/95 border border-cb-quinary-900/70 shadow-black/40 relative w-full overflow-hidden rounded-3xl shadow-lg"
		>
			<div class="flex items-center gap-3 px-4 py-2 md:grid md:grid-cols-3 md:gap-4 md:py-3">
				<div class="flex min-w-0 flex-1 items-center gap-3 md:col-start-1 md:row-start-1 md:flex-none">
					<div
						class="bg-cb-quinary-900/70 text-cb-tertiary-200 hidden h-10 w-10 items-center justify-center rounded-xl md:flex"
					>
						<UIcon name="i-material-symbols-music-note" class="h-5 w-5" />
					</div>
					<div v-if="!errorDetected" class="min-w-0">
						<p class="truncate font-semibold">{{ musicNamePlaying }}</p>
						<p class="text-cb-tertiary-400 truncate text-xs">
							{{ authorNamePlaying }}
						</p>
					</div>
					<div v-else class="min-w-0">
						<p class="text-cb-primary-900 font-bold">{{ errorMessage }}</p>
					</div>
					<div class="hidden items-center gap-2 md:flex">
						<UButton
							variant="ghost"
							:disabled="!isPlayerReady"
							:icon="
								volumeOn
									? 'i-material-symbols-volume-up'
									: 'i-material-symbols-volume-off'
							"
							size="sm"
							@click="muteVolume"
						/>
						<USlider
							v-model="volume"
							:min="0"
							:max="100"
							:disabled="!isPlayerReady"
							class="w-20"
							:ui="{
								track: 'h-1 rounded-full',
								thumb: 'h-3 w-3 rounded-full focus:outline-none',
								// @ts-expect-error - USlider ui accepts progress but types don't include it
								progress: 'h-1 rounded-full',
							}"
							@update:model-value="setVolume"
						/>
					</div>
				</div>

				<div class="flex items-center justify-center gap-1 md:gap-2 md:col-start-2 md:row-start-1">
					<UButton
						variant="ghost"
						class="hidden lg:block"
						:disabled="!isPlayerReady || !playlistInfo.hasPrevious"
						icon="i-material-symbols-skip-previous"
						size="sm"
						@click="skipToPrevious()"
					/>
					<UButton
						variant="ghost"
						class="hidden lg:block"
						:disabled="!isPlayerReady"
						icon="i-material-symbols-replay-10"
						size="sm"
						@click="seek(-10)"
					/>
					<UButton
						variant="ghost"
						class="md:hidden"
						:disabled="!isPlayerReady"
						icon="i-material-symbols-replay-10"
						size="sm"
						@click="seek(-10)"
					/>
					<UButton
						v-if="isPlaying"
						variant="ghost"
						:disabled="!isPlayerReady"
						icon="i-material-symbols-pause"
						size="lg"
						@click="togglePlayPause"
					/>
					<UButton
						v-else
						variant="ghost"
						:disabled="!isPlayerReady"
						icon="i-material-symbols-play-arrow"
						size="lg"
						@click="togglePlayPause"
					/>
					<UButton
						variant="ghost"
						class="md:hidden"
						:disabled="!isPlayerReady"
						icon="i-material-symbols-forward-10"
						size="sm"
						@click="seek(10)"
					/>
					<UButton
						variant="ghost"
						class="hidden lg:block"
						:disabled="!isPlayerReady"
						icon="i-material-symbols-forward-10"
						size="sm"
						@click="seek(10)"
					/>
					<UButton
						variant="ghost"
						class="hidden lg:block"
						:disabled="!isPlayerReady || !playlistInfo.hasNext"
						icon="i-material-symbols-skip-next"
						size="sm"
						@click="skipToNext()"
					/>
				</div>

				<div class="ml-auto flex items-center gap-2 md:ml-0 md:justify-end md:gap-2 md:col-start-3 md:row-start-1">
					<UButton
						variant="ghost"
						:disabled="!playlistInfo.isActive"
						icon="i-material-symbols-queue-music"
						size="sm"
						@click="showPlaylist = !showPlaylist"
					/>
					<UButton
						variant="ghost"
						size="sm"
						icon="i-material-symbols-minimize"
						@click="toggleMinimize"
					/>
					<UButton
						variant="ghost"
						size="sm"
						icon="i-material-symbols-close"
						@click="closeYTPlayer"
					/>
				</div>
			</div>

			<div class="px-4 pb-3">
				<USlider
					v-model="currentTime"
					:min="0"
					:max="duration"
					:disabled="!isPlayerReady"
					class="w-full"
					:ui="{
						track: 'h-1.5 rounded-full cursor-pointer',
						thumb: 'h-3 w-3 rounded-full cursor-pointer focus:outline-none',
						// @ts-expect-error - USlider ui accepts progress but types don't include it
						progress: 'h-1.5 rounded-full',
					}"
					@update:model-value="onSeekEnd"
					@mousedown="onSeekStart"
					@touchstart="onSeekStart"
				/>
				<div class="text-cb-tertiary-400 mt-1 flex items-center justify-between text-[11px]">
					<div class="flex items-center gap-1">
						<span>{{ convertDuration(currentTime) }}</span>
						<span>/</span>
						<span>{{ convertDuration(duration) }}</span>
					</div>
					<div v-if="playlistInfo.isActive" class="text-[11px] opacity-75">
						{{ playlistInfo.current }}/{{ playlistInfo.total }}
					</div>
				</div>
			</div>
		</div>

		<div
			v-else
			role="button"
			tabindex="0"
			class="bg-cb-secondary-950/95 border border-cb-quinary-900/70 relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-2xl shadow-lg"
			@click="toggleMinimize"
			@keydown.enter="toggleMinimize"
		>
			<UIcon name="i-material-symbols-music-note" class="h-6 w-6 text-white" />
			<button
				type="button"
				class="absolute right-1 top-1 rounded-full bg-black/60 p-1"
				@click.stop="togglePlayPause"
			>
				<UIcon
					:name="isPlaying ? 'i-material-symbols-pause' : 'i-material-symbols-play-arrow'"
					class="h-3 w-3 text-white"
				/>
			</button>
		</div>
	</div>
</template>

