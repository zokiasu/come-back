import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import {
	createInternalError,
	handleSupabaseError,
	isPostgrestError,
} from '#server/utils/errorHandler'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/releases/[id]/index.delete'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (routeId: string | undefined = 'release-id') => {
	vi.stubGlobal(
		'requireAdmin',
		vi.fn(async () => undefined),
	)
	vi.stubGlobal(
		'getRouterParam',
		vi.fn(() => routeId),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('createInternalError', createInternalError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('isPostgrestError', isPostgrestError)
}

describe('DELETE /api/releases/:id', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('should reject requests without a release id', async () => {
		setupGlobals('')
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn() }))

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
			statusMessage: 'Release ID is required',
		})
	})

	it('should return 404 when the release does not exist', async () => {
		setupGlobals()
		const fetchReleaseQuery = createSupabaseQueryMock({
			data: null,
			error: null,
		})
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => fetchReleaseQuery),
		}))

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 404,
			statusMessage: 'Release not found',
		})
	})

	it('should delete release relations and orphaned musics', async () => {
		setupGlobals()

		const fetchReleaseQuery = createSupabaseQueryMock({
			data: { id: 'release-id' },
			error: null,
		})
		const fetchMusicRelationsQuery = createSupabaseQueryMock({
			data: [{ music_id: 'music-1' }, { music_id: 'music-2' }],
			error: null,
		})
		const deleteArtistRelationsQuery = createSupabaseQueryMock({ error: null })
		const deleteMusicRelationsQuery = createSupabaseQueryMock({ error: null })
		const deletePlatformLinksQuery = createSupabaseQueryMock({ error: null })
		const stillLinkedMusicsQuery = createSupabaseQueryMock({
			data: [{ music_id: 'music-2' }],
			error: null,
		})
		const deleteMusicArtistsQuery = createSupabaseQueryMock({ error: null })
		const deleteOrphanMusicsQuery = createSupabaseQueryMock({ error: null })
		const deleteReleaseQuery = createSupabaseQueryMock({ error: null })
		const queriesByTable: Record<string, unknown[]> = {
			releases: [fetchReleaseQuery, deleteReleaseQuery],
			music_releases: [
				fetchMusicRelationsQuery,
				deleteMusicRelationsQuery,
				stillLinkedMusicsQuery,
			],
			artist_releases: [deleteArtistRelationsQuery],
			release_platform_links: [deletePlatformLinksQuery],
			music_artists: [deleteMusicArtistsQuery],
			musics: [deleteOrphanMusicsQuery],
		}
		const supabase = {
			from: vi.fn((table: string) => {
				const query = queriesByTable[table]?.shift()

				if (!query) throw new Error(`Unexpected table: ${table}`)

				return query
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()
		const result = await handler({})

		expect(result).toEqual({ success: true, partialErrors: undefined })
		expect(deleteMusicArtistsQuery.calls).toEqual([
			{ method: 'delete', args: [] },
			{ method: 'in', args: ['music_id', ['music-1']] },
		])
		expect(deleteOrphanMusicsQuery.calls).toEqual([
			{ method: 'delete', args: [] },
			{ method: 'in', args: ['id', ['music-1']] },
		])
		expect(deleteReleaseQuery.calls).toEqual([
			{ method: 'delete', args: [] },
			{ method: 'eq', args: ['id', 'release-id'] },
		])
	})

	it('should report partial relation deletion errors and still delete the release', async () => {
		setupGlobals()

		const relationError = new Error('artist relation delete failed')
		const queriesByTable: Record<string, unknown[]> = {
			releases: [
				createSupabaseQueryMock({ data: { id: 'release-id' }, error: null }),
				createSupabaseQueryMock({ error: null }),
			],
			music_releases: [
				createSupabaseQueryMock({ data: [], error: null }),
				createSupabaseQueryMock({ error: null }),
			],
			artist_releases: [createSupabaseQueryMock({ error: relationError })],
			release_platform_links: [createSupabaseQueryMock({ error: null })],
		}
		const supabase = {
			from: vi.fn((table: string) => {
				const query = queriesByTable[table]?.shift()

				if (!query) throw new Error(`Unexpected table: ${table}`)

				return query
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()

		await expect(handler({})).resolves.toEqual({
			success: true,
			partialErrors: [
				{
					table: 'artist_releases',
					error: 'artist relation delete failed',
				},
			],
		})
	})
})
