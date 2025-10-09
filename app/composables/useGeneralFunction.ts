import type { Artist, Release, Music } from '~/types'

export function useGeneralFunction() {
	// TODO: Add comment
	const formatArtistData = async (artistData: any) => {
		if (!artistData) return {} as Artist

		const { attributes } = artistData

		const artistTmp: any = {
			id: artistData.id,
			id_youtube_music: attributes.idYoutubeMusic || '',
			name: attributes.name,
			description: attributes.description || '',
			type: attributes.type,
			image: attributes.image,
			styles: attributes.styles || [],
			socialList: attributes.socialList || [],
			platformList: attributes.platformList || [],
			members: attributes.members
				? await formatArray(attributes.members.data, formatArtistData)
				: [],
			groups: attributes.groups
				? await formatArray(attributes.groups.data, formatArtistData)
				: [],
			releases: [],
		}

		return artistTmp
	}
	// TODO: Add comment
	const formatReleaseData = async (releaseData: any) => {
		if (!releaseData) return {} as Release

		const { attributes } = releaseData

		const releaseTmp: any = {
			id: releaseData.id,
			id_youtube_music: attributes.idYoutubeMusic,
			name: attributes.name,
			type: attributes.type,
			year: attributes.year,
			needToBeVerified: attributes.needToBeVerified,
			platformList: attributes.platformList || [],
			date: attributes.date,
			image: attributes.image || [],
			artists: attributes.artists
				? await formatArray(attributes.artists.data, formatArtistData)
				: [],
			musics: attributes.musics
				? await formatArray(attributes.music.data, formatMusicData)
				: [],
			artistsId: '', // Add the missing property 'artistsId'
			artistsName: '', // Add the missing property 'artistsName'
		}

		return releaseTmp
	}
	// TODO: Add comment
	const formatMusicData = async (musicData: any) => {
		if (!musicData) return {} as Music

		const { attributes } = musicData

		const musicTmp: any = {
			id: musicData.id,
			id_youtube_music: attributes.videoId,
			name: attributes.name,
			duration: attributes.duration,
			images: attributes.images || [],
			artists: attributes.artists
				? await formatArray(attributes.artists.data, formatArtistData)
				: [],
			releases: attributes.releases
				? await formatArray(attributes.releases.data, formatReleaseData)
				: [],
		}

		return musicTmp
	}
	// TODO: Add comment
	const formatArray = async (array: any[], formatter: (data: any) => Promise<any>) => {
		return await Promise.all(array.map(async (item) => await formatter(item)))
	}
	// TODO: Add comment
	const shuffleArray = (array: any) => {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
			;[array[i], array[j]] = [array[j], array[i]] // échange les éléments
		}
		return array
	}

	return {
		formatArtistData,
		formatReleaseData,
		formatMusicData,
		shuffleArray,
	}
}
