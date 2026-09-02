import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadMusic = async () => {
	const module = await import('../../../app/composables/Supabase/useSupabaseMusic')
	return module.useSupabaseMusic()
}

const setupGlobals = () => {
	const fetchMock = vi.fn()
	const toastAdd = vi.fn()
	const requireAuthHeaders = vi.fn(() => ({ Authorization: 'Bearer token' }))
	const runMutation = vi.fn(async <T>(operation: PromiseLike<T>) => await operation)

	vi.stubGlobal('$fetch', fetchMock)
	vi.stubGlobal('useToast', () => ({ add: toastAdd }))
	vi.stubGlobal('useApiAuthHeaders', () => ({ requireAuthHeaders }))
	vi.stubGlobal('useMutationTimeout', () => ({ runMutation }))
	vi.stubGlobal('extractErrorMessage', (error: unknown) =>
		error instanceof Error ? error.message : 'Unknown error',
	)

	return { fetchMock, requireAuthHeaders, runMutation, toastAdd }
}

describe('useSupabaseMusic', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('updates music data through the authenticated server route', async () => {
		const mocks = setupGlobals()
		const music = { id: 'music-1', name: 'Track' }
		mocks.fetchMock.mockResolvedValue(music)
		const api = await loadMusic()

		await expect(api.updateMusic('music-1', { name: 'Track' })).resolves.toBe(music)
		expect(mocks.fetchMock).toHaveBeenCalledWith('/api/musics/music-1', {
			method: 'PATCH',
			headers: { Authorization: 'Bearer token' },
			body: { updates: { name: 'Track' } },
		})
	})

	it('returns false and reports release-linking errors', async () => {
		const mocks = setupGlobals()
		mocks.fetchMock.mockRejectedValue(new Error('Linking rejected'))
		const api = await loadMusic()

		await expect(api.updateMusicReleases('music-1', ['release-1'])).resolves.toBe(false)
		expect(mocks.toastAdd).toHaveBeenCalledWith({
			title: 'Erreur lors de la mise à jour des releases',
			description: 'Linking rejected',
			color: 'error',
		})
	})

	it('keeps the default verified catalog request public', async () => {
		const mocks = setupGlobals()
		const response = { musics: [], total: 0 }
		mocks.fetchMock.mockResolvedValue(response)
		const api = await loadMusic()

		await expect(api.getMusicsByPage(1, 20)).resolves.toBe(response)
		expect(mocks.fetchMock).toHaveBeenCalledWith('/api/musics/paginated', {
			params: { page: '1', limit: '20', verified: 'true' },
			headers: undefined,
		})
		expect(mocks.requireAuthHeaders).not.toHaveBeenCalled()
	})

	it('serializes advanced filters and authenticates moderation queries', async () => {
		const mocks = setupGlobals()
		const response = { musics: [], total: 0 }
		mocks.fetchMock.mockResolvedValue(response)
		const api = await loadMusic()

		await expect(
			api.getMusicsByPage(3, 10, {
				search: 'track',
				years: [2025, 2026],
				artistIds: ['artist-1', 'artist-2'],
				styles: ['K-pop', 'R&B'],
				ismv: false,
				verified: null,
				orderBy: 'date',
				orderDirection: 'asc',
			}),
		).resolves.toBe(response)
		expect(mocks.fetchMock).toHaveBeenCalledWith('/api/musics/paginated', {
			params: {
				page: '3',
				limit: '10',
				search: 'track',
				years: '2025,2026',
				orderBy: 'date',
				orderDirection: 'asc',
				ismv: 'false',
				verified: 'null',
				artistIds: 'artist-1,artist-2',
				styles: 'K-pop,R&B',
			},
			headers: { Authorization: 'Bearer token' },
		})
	})

	it('returns false when deletion fails', async () => {
		const mocks = setupGlobals()
		mocks.fetchMock.mockRejectedValue(new Error('Delete rejected'))
		const api = await loadMusic()

		await expect(api.deleteMusic('music-1')).resolves.toBe(false)
		expect(mocks.toastAdd).toHaveBeenCalledWith(
			expect.objectContaining({ description: 'Delete rejected', color: 'error' }),
		)
	})
})
