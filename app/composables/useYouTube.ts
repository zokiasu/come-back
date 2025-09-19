export const useYouTube = () => {
	const idYoutubeVideo = useIdYoutubeVideo()
	const isPlayingVideo = useIsPlayingVideo()
	const musicNamePlaying = useMusicNamePlaying()
	const authorNamePlaying = useAuthorNamePlaying()

	// État du lecteur
	const isPlayerLoaded = ref(false)
	const playerError = ref<string | null>(null)

	// Fonction pour jouer une musique (utilisée maintenant par le système de playlist)
	const playMusic = (videoId: string, musicName: string, artistName: string) => {
		if (!videoId) {
			console.error('❌ ID vidéo manquant')
			return false
		}

		try {
			idYoutubeVideo.value = videoId
			musicNamePlaying.value = musicName || 'Titre inconnu'
			authorNamePlaying.value = artistName || 'Artiste inconnu'
			isPlayingVideo.value = true
			playerError.value = null

			return true
		} catch (error) {
			console.error('❌ Erreur lors de la lecture:', error)
			playerError.value = 'Erreur lors de la lecture'
			return false
		}
	}

	// Fonction pour ajouter une musique à la playlist (remplace playMusic dans l'interface utilisateur)
	const addToPlaylist = (videoId: string, musicName: string, artistName: string) => {
		const { addToPlaylist: addToPlaylistCore } = usePlaylist()
		return addToPlaylistCore(videoId, musicName, artistName)
	}

	// Fonction pour arrêter la musique
	const stopMusic = () => {
		isPlayingVideo.value = false
		idYoutubeVideo.value = ''
		musicNamePlaying.value = 'Music Name'
		authorNamePlaying.value = 'Author Name'
		playerError.value = null

		// Vider la playlist quand on arrête manuellement
		const { clearPlaylist } = usePlaylist()
		clearPlaylist()
	}

	// Vérifier si une musique spécifique est en cours de lecture
	const isCurrentlyPlaying = (videoId: string) => {
		return isPlayingVideo.value && idYoutubeVideo.value === videoId
	}

	// Basculer la lecture d'une musique (utilise maintenant le système de playlist)
	const toggleMusic = (videoId: string, musicName: string, artistName: string) => {
		if (isCurrentlyPlaying(videoId)) {
			stopMusic()
			return false
		} else {
			return addToPlaylist(videoId, musicName, artistName)
		}
	}

	return {
		// États
		idYoutubeVideo: readonly(idYoutubeVideo),
		isPlayingVideo: readonly(isPlayingVideo),
		musicNamePlaying: readonly(musicNamePlaying),
		authorNamePlaying: readonly(authorNamePlaying),
		isPlayerLoaded: readonly(isPlayerLoaded),
		playerError: readonly(playerError),

		// Actions
		playMusic,
		addToPlaylist,
		stopMusic,
		toggleMusic,
		isCurrentlyPlaying,
	}
}
