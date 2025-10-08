<script setup lang="ts">
	const idYoutubeVideo = useIdYoutubeVideo()
	const isPlayingVideo = useIsPlayingVideo()
	const musicNamePlaying = useMusicNamePlaying()
	const authorNamePlaying = useAuthorNamePlaying()

	const { skipToNext, skipToPrevious, getPlaylistInfo } = usePlaylist()
	const playlistInfo = computed(() => getPlaylistInfo())
	const showPlaylist = ref(false)

	const isPlaying = ref(false)
	const currentTime = ref(0)
	const duration = ref(0)
	const globalPlayerContainer = useTemplateRef('globalPlayerContainer')
	const player = ref<YT.Player | null>(null)
	const volumeOn = ref(true)
	const volume = ref(20)
	const errorDetected = ref(false)
	const errorMessage = ref('')
	const isPlayerReady = ref(false)
	const isSeeking = ref(false)

	let intervalId: ReturnType<typeof setInterval> | null = null

	// Création du lecteur YouTube
	const createPlayer = () => {
		if (!import.meta.client) return

		console.log('🎵 Création du lecteur YouTube avec vidéo:', idYoutubeVideo.value)

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

	const onPlayerReady = async (event: YT.PlayerEvent) => {
		console.log('✅ Lecteur YouTube prêt')
		isPlayerReady.value = true
		duration.value = event.target.getDuration()
		setVolume(volume.value)
		errorDetected.value = false
		errorMessage.value = ''
	}

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
			console.log('🎵 Fin de vidéo - tentative de lecture suivante')
			const { playNext } = usePlaylist()

			setTimeout(() => {
				const hasPlayedNext = playNext()
				if (!hasPlayedNext) {
					console.log('🎵 Aucune musique suivante - fin de playlist')
				}
			}, 500)
		}

		// Log des changements d'état pour debug
		const states = {
			[-1]: 'non démarré',
			[0]: 'terminé',
			[1]: 'lecture',
			[2]: 'pause',
			[3]: 'mise en mémoire tampon',
			[5]: "vidéo mise en file d'attente",
		}
		console.log('🎵 État du lecteur:', states[event.data] || event.data)
	}

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

	// Intercepter les erreurs de postMessage
	if (import.meta.client) {
		// Filtrer les erreurs postMessage YouTube au niveau global
		window.addEventListener('error', (event) => {
			if (
				event.error &&
				event.error.message &&
				event.error.message.includes('postMessage') &&
				event.error.message.includes('youtube.com')
			) {
				console.log('🎵 Info: Communication YouTube iframe (normal en développement)')
				event.preventDefault()
				return false
			}
		})

		// Filtrer aussi les erreurs de console
		const originalConsoleError = console.error
		console.error = (...args) => {
			const message = args.join(' ')
			// Filtrer les erreurs postMessage YouTube connues (non critiques)
			if (message.includes('postMessage') && message.includes('youtube.com')) {
				console.log('🎵 Info: Communication YouTube iframe (normal en localhost)')
				return
			}
			originalConsoleError.apply(console, args)
		}
	}

	const initYTPlayer = () => {
		if (!import.meta.client) return

		console.log('🎵 Initialisation du lecteur YouTube...')

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
			console.log('✅ API YouTube déjà chargée')
			createPlayer()
		} else {
			console.log("📥 Chargement de l'API YouTube...")

			// Vérifier si le script est déjà présent
			const existingScript = document.querySelector(
				'script[src*="youtube.com/iframe_api"]',
			)
			if (existingScript) {
				console.log('⏳ Script YouTube déjà en cours de chargement...')
				return
			}

			const tag = document.createElement('script')
			tag.src = 'https://www.youtube.com/iframe_api'
			tag.onload = () => {
				console.log('✅ Script YouTube chargé')
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
				console.log('✅ API YouTube prête')
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
				console.log('🔄 Changement de vidéo:', newId)
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
		console.log('🎵 Montage du composant YoutubePlayer')
		initYTPlayer()
		intervalId = setInterval(updateCurrentTime, 1000)
	})

	onBeforeUnmount(() => {
		console.log('🎵 Démontage du composant YoutubePlayer')

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

	const seek = (seconds) => {
		if (!import.meta.client || !player.value || !isPlayerReady.value) return

		try {
			const newTime = player.value?.getCurrentTime() + seconds
			player.value?.seekTo(newTime)
			currentTime.value = player.value?.getCurrentTime()
		} catch (error) {
			console.error('❌ Erreur lors du seek:', error)
		}
	}

	const onSeekStart = () => {
		isSeeking.value = true
	}

	const onSeekEnd = (newTime) => {
		if (!import.meta.client || !player.value || !isPlayerReady.value) return

		// Extraire la valeur si c'est un tableau (USlider retourne [value])
		const timeValue = Array.isArray(newTime) ? newTime[0] : (newTime ?? currentTime.value)

		try {
			player.value?.seekTo(timeValue)
			currentTime.value = timeValue
		} catch (error) {
			console.error('❌ Erreur lors du seekTo:', error)
		} finally {
			isSeeking.value = false
		}
	}

	const seekToTime = (newTime) => {
		// Pour l'événement @input, on met juste à jour l'affichage
		const timeValue = Array.isArray(newTime) ? newTime[0] : (newTime ?? currentTime.value)
		currentTime.value = timeValue
	}

	const setVolume = (newVolume) => {
		if (!import.meta.client || !player.value || !isPlayerReady.value) return

		// Extraire la valeur si c'est un tableau (USlider retourne [value])
		const volumeValue = Array.isArray(newVolume) ? newVolume[0] : newVolume

		try {
			player.value?.setVolume(volumeValue)
			volume.value = volumeValue
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
		console.log('🎵 Fermeture du lecteur YouTube')
		isPlayingVideo.value = false
		idYoutubeVideo.value = ''

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
	}

	const convertDuration = (duration) => {
		const minutes = Math.floor(duration / 60)
		let seconds = Math.round(duration % 60)

		seconds = seconds < 10 ? `0${seconds}` : seconds

		return `${minutes}:${seconds}`
	}
</script>

<template>
	<div
		class="fixed bottom-0 z-[1100] flex w-full flex-col items-center justify-center space-y-3 sm:items-end sm:justify-end"
	>
		<PlaylistPanel v-model:is-open="showPlaylist" class="min-w-80 lg:mr-3" />

		<div
			id="globalPlayerContainer"
			ref="globalPlayerContainer"
			class="hidden aspect-video w-1/4 min-w-[20rem] overflow-hidden rounded-lg px-2 lg:absolute lg:-top-72 lg:right-0 lg:z-50 lg:h-72"
		></div>

		<div
			class="bg-cb-secondary-950 relative flex w-full flex-row-reverse items-center justify-between px-5 py-3 lg:flex-row"
		>
			<div class="flex w-fit items-center space-x-2">
				<UButton
					variant="ghost"
					class="hidden lg:block"
					:disabled="!isPlayerReady || !playlistInfo.hasPrevious"
					@click="skipToPrevious"
					icon="i-material-symbols-skip-previous"
					size="lg"
				/>
				<UButton
					variant="ghost"
					class="hidden lg:block"
					:disabled="!isPlayerReady"
					@click="seek(-10)"
					icon="i-material-symbols-replay-10"
					size="lg"
				/>
				<UButton
					v-if="isPlaying"
					variant="ghost"
					:disabled="!isPlayerReady"
					@click="togglePlayPause"
					icon="i-material-symbols-pause"
					size="lg"
				/>
				<UButton
					v-else
					variant="ghost"
					:disabled="!isPlayerReady"
					@click="togglePlayPause"
					icon="i-material-symbols-play-arrow"
					size="lg"
				/>
				<UButton
					variant="ghost"
					class="hidden lg:block"
					:disabled="!isPlayerReady"
					@click="seek(10)"
					icon="i-material-symbols-forward-10"
					size="lg"
				/>
				<UButton
					variant="ghost"
					class="hidden lg:block"
					:disabled="!isPlayerReady || !playlistInfo.hasNext"
					@click="skipToNext"
					icon="i-material-symbols-skip-next"
					size="lg"
				/>
				<div class="hidden items-center gap-1 pl-5 text-xs md:flex">
					<p>{{ convertDuration(currentTime) }}</p>
					<p>/</p>
					<p>{{ convertDuration(duration) }}</p>
					<div v-if="playlistInfo.isActive" class="ml-3 text-xs opacity-75">
						{{ playlistInfo.current }}/{{ playlistInfo.total }}
					</div>
				</div>
				<UButton
					variant="ghost"
					class="sm:hidden"
					:disabled="!playlistInfo.isActive"
					@click="showPlaylist = !showPlaylist"
					icon="i-material-symbols-queue-music"
					size="sm"
				/>
			</div>
			<div v-if="!errorDetected" class="flex w-fit items-center gap-2">
				<div class="flex w-fit flex-col items-start lg:items-center">
					<p class="font-semibold text-nowrap">{{ authorNamePlaying }}</p>
					<p class="text-xs text-nowrap">{{ musicNamePlaying }}</p>
				</div>
			</div>
			<div v-else class="w-full sm:w-fit">
				<p class="text-cb-primary-900 font-bold">{{ errorMessage }}</p>
			</div>
			<div class="hidden items-center gap-2 sm:flex">
				<UButton
					variant="ghost"
					:disabled="!playlistInfo.isActive"
					@click="showPlaylist = !showPlaylist"
					icon="i-material-symbols-queue-music"
					size="lg"
				/>
				<UButton
					variant="ghost"
					:disabled="!isPlayerReady"
					@click="muteVolume"
					:icon="
						volumeOn ? 'i-material-symbols-volume-up' : 'i-material-symbols-volume-off'
					"
					size="lg"
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
						progress: 'h-1 rounded-full',
					}"
					@update:model-value="setVolume"
				/>
			</div>

			<USlider
				v-model="currentTime"
				:min="0"
				:max="duration"
				:disabled="!isPlayerReady"
				class="absolute -top-1 left-0 w-full"
				:ui="{
					track: 'h-1 rounded-full cursor-pointer',
					thumb: 'h-3 w-3 rounded-full cursor-pointer focus:outline-none',
					progress: 'h-1 rounded-full',
				}"
				@update:model-value="onSeekEnd"
				@mousedown="onSeekStart"
				@touchstart="onSeekStart"
			/>
			<button
				class="bg-cb-primary-900 absolute -top-6 left-2 cursor-pointer rounded-t-lg px-3 py-0.5 text-xs font-semibold uppercase"
				@click="closeYTPlayer"
			>
				Close
			</button>
		</div>
	</div>
</template>
