export interface PlaylistItem {
	uid: string
	videoId: string
	title: string
	artist: string
	image?: string
	ismv?: boolean
	addedAt: Date
}

export const usePlaylist = () => {
	const playlist = useState<PlaylistItem[]>('playlist', () => [])
	const currentIndex = useState<number>('currentPlaylistIndex', () => -1)
	const isPlaylistActive = useState<boolean>('isPlaylistActive', () => false)

	const { playMusic, stopMusic } = useYouTube()

	const createPlaylistItem = (
		videoId: string,
		title: string,
		artist: string,
		image?: string,
		ismv?: boolean,
	): PlaylistItem => ({
		uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		videoId,
		title: title || 'Unknown title',
		artist: artist || 'Unknown artist',
		image,
		ismv,
		addedAt: new Date(),
	})

	const addToPlaylist = (
		videoId: string,
		title: string,
		artist: string,
		image?: string,
		ismv?: boolean,
	) => {
		if (!videoId) {
			console.error('❌ Missing video ID for playlist add')
			return false
		}

		const newItem = createPlaylistItem(videoId, title, artist, image, ismv)
		const isFirstItem = playlist.value.length === 0
		playlist.value.push(newItem)

		const toast = useToast()
		const musicName = title || 'Unknown title'
		toast.add({
			title: `${musicName} was added to the playlist`,
			color: 'success',
			duration: 1000,
			progress: false,
			ui: {
				root: 'bg-cb-secondary-950 rounded-lg',
				title: 'text-white text-center font-medium',
			},
		})

		if (isFirstItem) {
			currentIndex.value = 0
			isPlaylistActive.value = true
			return playMusic(videoId, title, artist)
		}

		return true
	}

	const playNow = (
		videoId: string,
		title: string,
		artist: string,
		image?: string,
		ismv?: boolean,
	) => {
		if (!videoId) {
			console.error('❌ Missing video ID for direct playback')
			return false
		}

		const nextItem = createPlaylistItem(videoId, title, artist, image, ismv)
		playlist.value = [nextItem]
		currentIndex.value = 0
		isPlaylistActive.value = true

		return playMusic(nextItem.videoId, nextItem.title, nextItem.artist)
	}

	const playNext = () => {
		if (!isPlaylistActive.value || playlist.value.length === 0) {
			return false
		}

		const nextIndex = currentIndex.value + 1

		if (nextIndex >= playlist.value.length) {
			clearPlaylist()
			stopMusic()
			return false
		}

		const nextItem = playlist.value[nextIndex]
		if (!nextItem) return false

		currentIndex.value = nextIndex
		return playMusic(nextItem.videoId, nextItem.title, nextItem.artist)
	}

	const playPrevious = () => {
		if (!isPlaylistActive.value || playlist.value.length === 0) {
			return false
		}

		const previousIndex = currentIndex.value - 1

		if (previousIndex < 0) {
			return false
		}

		const previousItem = playlist.value[previousIndex]
		if (!previousItem) return false

		currentIndex.value = previousIndex
		return playMusic(previousItem.videoId, previousItem.title, previousItem.artist)
	}

	const playAtIndex = (index: number) => {
		if (!isPlaylistActive.value || index < 0 || index >= playlist.value.length) {
			console.error('❌ Invalid index or inactive playlist')
			return false
		}

		const item = playlist.value[index]
		if (!item) return false

		currentIndex.value = index
		return playMusic(item.videoId, item.title, item.artist)
	}

	const removeFromPlaylist = (index: number) => {
		if (index < 0 || index >= playlist.value.length) {
			console.error('❌ Invalid index for removal')
			return false
		}

		playlist.value.splice(index, 1)

		if (index === currentIndex.value) {
			if (playlist.value.length === 0) {
				clearPlaylist()
				stopMusic()
			} else if (index >= playlist.value.length) {
				currentIndex.value = playlist.value.length - 1
			}
		} else if (index < currentIndex.value) {
			currentIndex.value -= 1
		}

		return true
	}

	const clearPlaylist = () => {
		playlist.value = []
		currentIndex.value = -1
		isPlaylistActive.value = false
	}

	const reorderPlaylist = (nextPlaylist: PlaylistItem[]) => {
		const currentItem = playlist.value[currentIndex.value]

		playlist.value = nextPlaylist

		if (playlist.value.length === 0) {
			currentIndex.value = -1
			isPlaylistActive.value = false
			return
		}

		if (currentItem) {
			const nextIndex = playlist.value.findIndex((item) => item.uid === currentItem.uid)
			currentIndex.value = nextIndex >= 0 ? nextIndex : 0
		}
	}

	const skipToNext = () => {
		return playNext()
	}

	const skipToPrevious = () => {
		return playPrevious()
	}

	const getCurrentItem = () => {
		if (currentIndex.value >= 0 && currentIndex.value < playlist.value.length) {
			return playlist.value[currentIndex.value]
		}
		return null
	}

	const hasNext = () => {
		return isPlaylistActive.value && currentIndex.value < playlist.value.length - 1
	}

	const hasPrevious = () => {
		return isPlaylistActive.value && currentIndex.value > 0
	}

	const getPlaylistInfo = () => {
		return {
			total: playlist.value.length,
			current: currentIndex.value + 1,
			hasNext: hasNext(),
			hasPrevious: hasPrevious(),
			isActive: isPlaylistActive.value,
		}
	}

	return {
		playlist: readonly(playlist),
		currentIndex: readonly(currentIndex),
		isPlaylistActive: readonly(isPlaylistActive),
		addToPlaylist,
		playNow,
		playNext,
		playPrevious,
		playAtIndex,
		removeFromPlaylist,
		clearPlaylist,
		reorderPlaylist,
		skipToNext,
		skipToPrevious,
		getCurrentItem,
		hasNext,
		hasPrevious,
		getPlaylistInfo,
	}
}
