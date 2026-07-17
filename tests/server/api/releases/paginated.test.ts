import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import {
	createInternalError,
	handleSupabaseError,
	isPostgrestError,
} from '#server/utils/errorHandler'
import {
	validateArrayParam,
	validateLimitParam,
	validateOrderBy,
	validateOrderDirection,
	validatePageParam,
	validateSearchParam,
} from '#server/utils/validation'
import { transformJunction } from '#server/utils/transformers'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/releases/paginated.get'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (query: Record<string, string | undefined>) => {
	vi.stubGlobal(
		'getQuery',
		vi.fn(() => query),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('createInternalError', createInternalError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('isPostgrestError', isPostgrestError)
	vi.stubGlobal('setHeader', vi.fn())
	vi.stubGlobal('transformJunction', transformJunction)
	vi.stubGlobal('validateArrayParam', validateArrayParam)
	vi.stubGlobal('validateLimitParam', validateLimitParam)
	vi.stubGlobal('validateOrderBy', validateOrderBy)
	vi.stubGlobal('validateOrderDirection', validateOrderDirection)
	vi.stubGlobal('validatePageParam', validatePageParam)
	vi.stubGlobal('validateSearchParam', validateSearchParam)
	vi.stubGlobal(
		'getRequestIP',
		vi.fn(() => '127.0.0.1'),
	)
	vi.stubGlobal(
		'requireContributor',
		vi.fn(async () => ({ id: 'admin-id', role: 'ADMIN' })),
	)
}

describe('GET /api/releases/paginated', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('should apply filters, sorting and pagination while flattening relations', async () => {
		setupGlobals({
			page: '2',
			limit: '2',
			search: 'dream',
			type: 'ALBUM',
			orderBy: 'name',
			orderDirection: 'asc',
			verified: 'true',
		})

		const rawRelease = {
			id: 'release-id',
			name: 'Dreamscape',
			artists: [
				{
					artist: {
						id: 'artist-id',
						name: 'NCT Dream',
					},
				},
			],
			musics: [
				{
					music: {
						id: 'music-id',
						name: 'When I Am With You',
					},
				},
			],
			platform_links: null,
		}
		const countQuery = createSupabaseQueryMock({ count: 3, error: null })
		const dataQuery = createSupabaseQueryMock({
			data: [rawRelease],
			error: null,
		})
		const supabase = {
			from: vi.fn().mockReturnValueOnce(countQuery).mockReturnValueOnce(dataQuery),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()
		const result = await handler({})

		expect(supabase.from).toHaveBeenNthCalledWith(1, 'releases')
		expect(supabase.from).toHaveBeenNthCalledWith(2, 'releases')
		expect(countQuery.calls).toEqual([
			{
				method: 'select',
				args: [
					expect.stringContaining('artists:artist_releases!inner'),
					{ count: 'exact', head: true },
				],
			},
			{ method: 'eq', args: ['artists.artist.verified', true] },
			{ method: 'ilike', args: ['name', '%dream%'] },
			{ method: 'eq', args: ['type', 'ALBUM'] },
			{ method: 'eq', args: ['verified', true] },
		])
		expect(dataQuery.calls).toEqual([
			{
				method: 'select',
				args: [expect.stringContaining('platform_links:release_platform_links')],
			},
			{ method: 'eq', args: ['artists.artist.verified', true] },
			{ method: 'ilike', args: ['name', '%dream%'] },
			{ method: 'eq', args: ['type', 'ALBUM'] },
			{ method: 'eq', args: ['verified', true] },
			{ method: 'order', args: ['name', { ascending: true }] },
			{ method: 'range', args: [2, 3] },
		])
		expect(result).toEqual({
			releases: [
				{
					...rawRelease,
					artists: [
						{
							id: 'artist-id',
							name: 'NCT Dream',
						},
					],
					musics: [
						{
							id: 'music-id',
							name: 'When I Am With You',
						},
					],
					platform_links: [],
				},
			],
			total: 3,
			page: 2,
			limit: 2,
			totalPages: 2,
		})
	})

	it('should return an empty page when artist filters match no releases', async () => {
		setupGlobals({
			page: '1',
			limit: '12',
			artistIds: 'artist-1,artist-2',
		})

		const countQuery = createSupabaseQueryMock({ count: 0, error: null })
		const dataQuery = createSupabaseQueryMock({ data: [], error: null })
		const artistReleaseQuery = createSupabaseQueryMock({
			data: [],
			error: null,
		})
		const supabase = {
			from: vi
				.fn()
				.mockReturnValueOnce(countQuery)
				.mockReturnValueOnce(dataQuery)
				.mockReturnValueOnce(artistReleaseQuery),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()
		const result = await handler({})

		expect(artistReleaseQuery.calls).toEqual([
			{ method: 'select', args: ['release_id'] },
			{ method: 'in', args: ['artist_id', ['artist-1', 'artist-2']] },
		])
		expect(dataQuery.order).not.toHaveBeenCalled()
		expect(result).toEqual({
			releases: [],
			total: 0,
			page: 1,
			limit: 12,
			totalPages: 0,
		})
	})

	it('should map Supabase errors with the releases pagination context', async () => {
		setupGlobals({})

		const countQuery = createSupabaseQueryMock({ count: 0, error: null })
		const dataQuery = createSupabaseQueryMock({
			data: null,
			error: {
				code: '42P01',
				message: 'relation does not exist',
				details: 'missing table',
				hint: '',
			},
		})
		const supabase = {
			from: vi.fn().mockReturnValueOnce(countQuery).mockReturnValueOnce(dataQuery),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 500,
			data: {
				context: 'releases.paginated',
			},
		})
	})
})
