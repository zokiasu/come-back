// YouTube IFrame Player API Type Declarations
// https://developers.google.com/youtube/iframe_api_reference

declare global {
	interface Window {
		YT: typeof YT
		onYouTubeIframeAPIReady: (() => void) | undefined
	}
}

declare namespace YT {
	enum PlayerState {
		UNSTARTED = -1,
		ENDED = 0,
		PLAYING = 1,
		PAUSED = 2,
		BUFFERING = 3,
		CUED = 5,
	}

	interface PlayerOptions {
		height?: string | number
		width?: string | number
		videoId?: string
		playerVars?: PlayerVars
		events?: Events
	}

	interface PlayerVars {
		autoplay?: 0 | 1
		cc_lang_pref?: string
		cc_load_policy?: 0 | 1
		color?: 'red' | 'white'
		controls?: 0 | 1 | 2
		disablekb?: 0 | 1
		enablejsapi?: 0 | 1
		end?: number
		fs?: 0 | 1
		hl?: string
		iv_load_policy?: 1 | 3
		list?: string
		listType?: 'playlist' | 'search' | 'user_uploads'
		loop?: 0 | 1
		modestbranding?: 0 | 1
		origin?: string
		playlist?: string
		playsinline?: 0 | 1
		rel?: 0 | 1
		showinfo?: 0 | 1
		start?: number
		widget_referrer?: string
	}

	interface Events {
		onReady?: (event: PlayerEvent) => void
		onStateChange?: (event: OnStateChangeEvent) => void
		onPlaybackQualityChange?: (event: OnPlaybackQualityChangeEvent) => void
		onPlaybackRateChange?: (event: OnPlaybackRateChangeEvent) => void
		onError?: (event: OnErrorEvent) => void
		onApiChange?: (event: PlayerEvent) => void
	}

	interface PlayerEvent {
		target: Player
	}

	interface OnStateChangeEvent extends PlayerEvent {
		data: PlayerState
	}

	interface OnPlaybackQualityChangeEvent extends PlayerEvent {
		data: string
	}

	interface OnPlaybackRateChangeEvent extends PlayerEvent {
		data: number
	}

	interface OnErrorEvent extends PlayerEvent {
		data: number
	}

	class Player {
		constructor(elementId: string | HTMLElement, options: PlayerOptions)

		// Queueing functions
		loadVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void
		cueVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void
		loadVideoByUrl(mediaContentUrl: string, startSeconds?: number, suggestedQuality?: string): void
		cueVideoByUrl(mediaContentUrl: string, startSeconds?: number, suggestedQuality?: string): void

		// Playing
		playVideo(): void
		pauseVideo(): void
		stopVideo(): void
		seekTo(seconds: number, allowSeekAhead: boolean): void

		// Volume
		mute(): void
		unMute(): void
		isMuted(): boolean
		setVolume(volume: number): void
		getVolume(): number

		// Playback rate
		getPlaybackRate(): number
		setPlaybackRate(suggestedRate: number): void
		getAvailablePlaybackRates(): number[]

		// Playlist
		nextVideo(): void
		previousVideo(): void
		playVideoAt(index: number): void

		// Status
		getPlayerState(): PlayerState
		getCurrentTime(): number
		getDuration(): number
		getVideoLoadedFraction(): number
		getVideoUrl(): string
		getVideoEmbedCode(): string

		// Playlist status
		getPlaylist(): string[]
		getPlaylistIndex(): number

		// Video info
		getVideoData(): {
			video_id: string
			title: string
			author: string
		}

		// Player sizing
		setSize(width: number, height: number): void

		// DOM node
		getIframe(): HTMLIFrameElement
		destroy(): void

		// Event listeners
		addEventListener(event: string, listener: (event: PlayerEvent) => void): void
		removeEventListener(event: string, listener: (event: PlayerEvent) => void): void
	}

	const PlayerState: {
		UNSTARTED: -1
		ENDED: 0
		PLAYING: 1
		PAUSED: 2
		BUFFERING: 3
		CUED: 5
	}
}

export {}
