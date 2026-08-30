import type { Artist, ArtistType, Music, Release } from '~/types'

interface SearchResult {
	artists: Artist[]
	totalCount: number
}

interface SearchReleaseResult {
	releases: (Release & {
		artists?: Artist[]
		musics?: Array<{ id_youtube_music?: string | null; name?: string | null }>
	})[]
	totalCount: number
}

interface SearchMusicResult {
	musics: (Music & { artists?: Artist[]; releases?: Release[] })[]
	totalCount: number
}

interface SearchOptions {
	query: string
	limit?: number
	type?: ArtistType
}

export function useSupabaseSearch() {
	const normalizeOptions = (options: SearchOptions) => ({
		search: options.query.trim(),
		limit: options.limit ?? 10,
		...(options.type ? { type: options.type } : {}),
	})

	const searchArtists = async (options: SearchOptions): Promise<SearchResult> => {
		if (options.query.trim().length < 2) return { artists: [], totalCount: 0 }

		const result = await $fetch<{ artists: Artist[] }>('/api/artists/search', {
			query: normalizeOptions(options),
		})
		return { artists: result.artists, totalCount: result.artists.length }
	}

	const searchArtistsFullText = searchArtists

	const searchReleases = async (options: SearchOptions): Promise<SearchReleaseResult> => {
		if (options.query.trim().length < 2) return { releases: [], totalCount: 0 }

		return $fetch<SearchReleaseResult>('/api/search/releases', {
			query: normalizeOptions(options),
		})
	}

	const searchMusics = async (options: SearchOptions): Promise<SearchMusicResult> => {
		if (options.query.trim().length < 2) return { musics: [], totalCount: 0 }

		return $fetch<SearchMusicResult>('/api/search/musics', {
			query: normalizeOptions(options),
		})
	}

	return {
		searchArtists,
		searchArtistsFullText,
		searchReleases,
		searchMusics,
	}
}
