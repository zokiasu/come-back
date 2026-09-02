import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadRelease = async () => {
	const module = await import('../../../app/composables/Supabase/useSupabaseRelease')
	return module.useSupabaseRelease()
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

describe('useSupabaseRelease', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('updates a release without sending relation-owned link fields', async () => {
		const mocks = setupGlobals()
		const release = { id: 'release-1', name: 'Release' }
		mocks.fetchMock.mockResolvedValue(release)
		const api = await loadRelease()

		await expect(
			api.updateRelease('release-1', { name: 'Release' }, [
				{
					name: 'Spotify',
					link: 'https://open.spotify.com/album/example',
					release_id: 'stale-release-id',
				},
			]),
		).resolves.toBe(release)
		expect(mocks.fetchMock).toHaveBeenCalledWith('/api/releases/release-1', {
			method: 'PATCH',
			headers: { Authorization: 'Bearer token' },
			body: {
				updates: { name: 'Release' },
				platformLinks: [
					{
						name: 'Spotify',
						link: 'https://open.spotify.com/album/example',
					},
				],
			},
		})
	})

	it('returns null and exposes a readable update error', async () => {
		const mocks = setupGlobals()
		mocks.fetchMock.mockRejectedValue(new Error('Update rejected'))
		const api = await loadRelease()

		await expect(api.updateRelease('release-1', { name: 'Broken' })).resolves.toBeNull()
		expect(mocks.toastAdd).toHaveBeenCalledWith({
			title: 'Error while updating release',
			description: 'Update rejected',
			color: 'error',
		})
	})

	it('serializes pagination filters and authenticates non-public queries', async () => {
		const mocks = setupGlobals()
		const response = { releases: [], total: 0 }
		mocks.fetchMock.mockResolvedValue(response)
		const api = await loadRelease()

		await expect(
			api.getReleasesByPage(2, 25, {
				search: 'name',
				type: 'ALBUM',
				orderBy: 'date',
				orderDirection: 'desc',
				verified: false,
				artistIds: ['artist-1', 'artist-2'],
			}),
		).resolves.toBe(response)
		expect(mocks.fetchMock).toHaveBeenCalledWith('/api/releases/paginated', {
			params: {
				page: '2',
				limit: '25',
				search: 'name',
				type: 'ALBUM',
				orderBy: 'date',
				orderDirection: 'desc',
				verified: 'false',
				artistIds: 'artist-1,artist-2',
			},
			headers: { Authorization: 'Bearer token' },
		})
	})

	it('deletes a release through the mutation timeout wrapper', async () => {
		const mocks = setupGlobals()
		mocks.fetchMock.mockResolvedValue(undefined)
		const api = await loadRelease()

		await expect(api.deleteRelease('release-1')).resolves.toBe(true)
		expect(mocks.runMutation).toHaveBeenCalledWith(
			expect.any(Promise),
			'Deleting the release timed out. Please try again.',
		)
	})
})
