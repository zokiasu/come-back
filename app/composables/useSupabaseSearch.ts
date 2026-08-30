import type { ArtistType } from '~/types'
import type {
	ArtistSearchResponse,
	SearchMusicResponse,
	SearchReleaseResponse,
} from '~/types/api'

type SearchResult = ArtistSearchResponse & { totalCount: number }

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

		const result = await $fetch<ArtistSearchResponse>('/api/artists/search', {
			query: normalizeOptions(options),
		})
		return { artists: result.artists, totalCount: result.artists.length }
	}

	const searchArtistsFullText = searchArtists

	const searchReleases = async (
		options: SearchOptions,
	): Promise<SearchReleaseResponse> => {
		if (options.query.trim().length < 2) return { releases: [], totalCount: 0 }

		return $fetch<SearchReleaseResponse>('/api/search/releases', {
			query: normalizeOptions(options),
		})
	}

	const searchMusics = async (options: SearchOptions): Promise<SearchMusicResponse> => {
		if (options.query.trim().length < 2) return { musics: [], totalCount: 0 }

		return $fetch<SearchMusicResponse>('/api/search/musics', {
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
