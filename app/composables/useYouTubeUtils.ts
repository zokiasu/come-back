export function useYouTubeUtils() {
	type YoutubeApiResponse = {
		items?: unknown[]
		nextPageToken?: string
	}

	// Fetches details of a YouTube video using the YouTube Data API.
	const getVideoFullDetails = async (videoId: string, apiKey: string) => {
		const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,status&key=${apiKey}`

		try {
			const response = await fetch(url)
			const data = await response.json()
			return data.items && data.items.length ? data.items[0] : null
		} catch (error) {
			console.error('Erreur lors de la récupération des détails de la vidéo:', error)
			return null
		}
	}

	// Fetches all videos from a YouTube playlist
	const getAllVideosFromPlaylist = async (playlistId: string, apiKey: string) => {
		const baseUrl = `https://youtube.googleapis.com/youtube/v3/playlistItems`
		let allItems: unknown[] = []
		let pageToken = ''

		try {
			do {
				const url = `${baseUrl}?part=snippet,contentDetails,id,status&playlistId=${playlistId}&key=${apiKey}&maxResults=50&pageToken=${pageToken}`
				const response = await fetch(url)
				const data = (await response.json()) as YoutubeApiResponse

				if (data.items) {
					allItems = allItems.concat(data.items)
				}

				pageToken = data.nextPageToken || ''
			} while (pageToken)

			return allItems
		} catch (error) {
			console.error('Erreur lors de la récupération des vidéos de la playlist:', error)
			return null
		}
	}

	return {
		getVideoFullDetails,
		getAllVideosFromPlaylist,
	}
}
