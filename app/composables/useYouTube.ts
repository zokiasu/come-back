export const useYouTube = () => {
	const idYoutubeVideo = useIdYoutubeVideo()
	const isPlayingVideo = useIsPlayingVideo()
	const musicNamePlaying = useMusicNamePlaying()
	const authorNamePlaying = useAuthorNamePlaying()

	const isPlayerLoaded = ref(false)
	const playerError = ref<string | null>(null)

	const playMusic = (videoId: string, musicName: string, artistName: string) => {
		if (!videoId) {
			console.error('❌ Missing video ID')
			return false
		}

		try {
			idYoutubeVideo.value = videoId
			musicNamePlaying.value = musicName || 'Unknown title'
			authorNamePlaying.value = artistName || 'Unknown artist'
			isPlayingVideo.value = true
			playerError.value = null

			return true
		} catch (error) {
			console.error('❌ Playback error:', error)
			playerError.value = 'Playback error'
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
		isCurrentlyPlaying,
	}
}
