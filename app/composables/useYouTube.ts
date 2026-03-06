export const useYouTube = () => {
	const idYoutubeVideo = useIdYoutubeVideo()
	const isPlayingVideo = useIsPlayingVideo()
	const musicNamePlaying = useMusicNamePlaying()
	const authorNamePlaying = useAuthorNamePlaying()

	const isPlayerLoaded = ref(false)
	const playerError = ref<string | null>(null)

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

	const addToPlaylist = (
		videoId: string,
		musicName: string,
		artistName: string,
		image?: string,
		ismv?: boolean,
	) => {
		const { addToPlaylist: addToPlaylistCore } = usePlaylist()
		return addToPlaylistCore(videoId, musicName, artistName, image, ismv)
	}

	const playNow = (
		videoId: string,
		musicName: string,
		artistName: string,
		image?: string,
		ismv?: boolean,
	) => {
		const { playNow: playNowCore } = usePlaylist()
		return playNowCore(videoId, musicName, artistName, image, ismv)
	}

	const stopMusic = () => {
		isPlayingVideo.value = false
		idYoutubeVideo.value = ''
		musicNamePlaying.value = 'Music Name'
		authorNamePlaying.value = 'Author Name'
		playerError.value = null

		const { clearPlaylist } = usePlaylist()
		clearPlaylist()
	}

	const isCurrentlyPlaying = (videoId: string) => {
		return isPlayingVideo.value && idYoutubeVideo.value === videoId
	}

	const toggleMusic = (
		videoId: string,
		musicName: string,
		artistName: string,
		image?: string,
		ismv?: boolean,
	) => {
		if (isCurrentlyPlaying(videoId)) {
			stopMusic()
			return false
		} else {
			return addToPlaylist(videoId, musicName, artistName, image, ismv)
		}
	}

	return {
		idYoutubeVideo: readonly(idYoutubeVideo),
		isPlayingVideo: readonly(isPlayingVideo),
		musicNamePlaying: readonly(musicNamePlaying),
		authorNamePlaying: readonly(authorNamePlaying),
		isPlayerLoaded: readonly(isPlayerLoaded),
		playerError: readonly(playerError),
		playMusic,
		addToPlaylist,
		playNow,
		stopMusic,
		toggleMusic,
		isCurrentlyPlaying,
	}
}
