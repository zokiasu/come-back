// Composables YouTube avec persistance
export const useIdYoutubeVideo = () =>
	useState<string>('idYoutubeVideo', () => 'L9Ts6kiEAts')

export const useMusicNamePlaying = () =>
	useState<string>('musicNamePlaying', () => 'Music Name')

export const useAuthorNamePlaying = () =>
	useState<string>('authorNamePlaying', () => 'Author Name')

export const useIsPlayingVideo = () => useState<boolean>('isPlayingVideo', () => false)

// Autres composables
export const useLastRoomYouTryToJoined = () =>
	useState<string>('lastRoomYouTryToJoined', () => '')
