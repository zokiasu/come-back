import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadSearch = async () => {
	const module = await import('../../../app/composables/useSupabaseSearch')
	return module.useSupabaseSearch()
}

describe('useSupabaseSearch', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
	})

	it('does not call the API for queries shorter than two characters', async () => {
		const fetchMock = vi.fn()
		vi.stubGlobal('$fetch', fetchMock)
		const search = await loadSearch()

		await expect(search.searchArtists({ query: ' a ' })).resolves.toEqual({
			artists: [],
			totalCount: 0,
		})
		await expect(search.searchReleases({ query: ' ' })).resolves.toEqual({
			releases: [],
			totalCount: 0,
		})
		await expect(search.searchMusics({ query: 'x' })).resolves.toEqual({
			musics: [],
			totalCount: 0,
		})
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('normalizes artist search options and derives the total count', async () => {
		const artists = [{ id: 'artist-1', name: 'Artist' }]
		const fetchMock = vi.fn(async () => ({ artists }))
		vi.stubGlobal('$fetch', fetchMock)
		const search = await loadSearch()

		await expect(
			search.searchArtistsFullText({ query: '  artist  ', limit: 5, type: 'SOLO' }),
		).resolves.toEqual({ artists, totalCount: 1 })
		expect(fetchMock).toHaveBeenCalledWith('/api/artists/search', {
			query: { search: 'artist', limit: 5, type: 'SOLO' },
		})
	})

	it('uses the default limit for release and music searches', async () => {
		const releaseResult = { releases: [], totalCount: 12 }
		const musicResult = { musics: [], totalCount: 8 }
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(releaseResult)
			.mockResolvedValueOnce(musicResult)
		vi.stubGlobal('$fetch', fetchMock)
		const search = await loadSearch()

		await expect(search.searchReleases({ query: ' comeback ' })).resolves.toBe(
			releaseResult,
		)
		await expect(search.searchMusics({ query: ' title ' })).resolves.toBe(musicResult)
		expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/search/releases', {
			query: { search: 'comeback', limit: 10 },
		})
		expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/search/musics', {
			query: { search: 'title', limit: 10 },
		})
	})
})
