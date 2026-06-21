import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import {
	createInternalError,
	handleSupabaseError,
	isPostgrestError,
} from '#server/utils/errorHandler'
import { transformJunction } from '#server/utils/transformers'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/dashboard/overview.get'
	const module = await import(modulePath)

	return module.default as () => Promise<unknown>
}

const setupGlobals = () => {
	vi.stubGlobal(
		'requireAdmin',
		vi.fn(async () => ({ id: 'admin-id', role: 'ADMIN' })),
	)
	vi.stubGlobal('setHeader', vi.fn())
	vi.stubGlobal('createInternalError', createInternalError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('isPostgrestError', isPostgrestError)
	vi.stubGlobal('transformJunction', transformJunction)
}

describe('GET /api/dashboard/overview', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-05-15T12:00:00Z'))
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should aggregate dashboard stats and flatten recent relations', async () => {
		setupGlobals()

		const recentArtist = {
			id: 'artist-id',
			name: 'IVE',
		}
		const recentRelease = {
			id: 'release-id',
			name: 'IVE EMPATHY',
			created_at: '2026-05-01T00:00:00Z',
			artists: [
				{
					artist: recentArtist,
				},
			],
		}
		const oldRelease = {
			id: 'old-release-id',
			name: 'Older Release',
			created_at: '2026-03-01T00:00:00Z',
			artists: [],
		}
		const recentNews = {
			id: 'news-id',
			title: 'Comeback announced',
			artists: [
				{
					artist: recentArtist,
				},
			],
		}
		const queries = [
			createSupabaseQueryMock({ count: 12, error: null }),
			createSupabaseQueryMock({ count: 20, error: null }),
			createSupabaseQueryMock({ count: 5, error: null }),
			createSupabaseQueryMock({ count: 9, error: null }),
			createSupabaseQueryMock({
				data: [{ verified: true }, { verified: false }, { verified: true }],
				error: null,
			}),
			createSupabaseQueryMock({ data: [recentArtist], error: null }),
			createSupabaseQueryMock({
				data: [recentRelease, oldRelease],
				error: null,
			}),
			createSupabaseQueryMock({ data: [recentNews], error: null }),
		]
		const supabase = {
			from: vi.fn(() => {
				const query = queries.shift()

				if (!query) throw new Error('Unexpected Supabase query')

				return query
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()
		const result = await handler()

		expect(supabase.from).toHaveBeenNthCalledWith(1, 'artists')
		expect(supabase.from).toHaveBeenNthCalledWith(2, 'releases')
		expect(supabase.from).toHaveBeenNthCalledWith(3, 'news')
		expect(supabase.from).toHaveBeenNthCalledWith(4, 'artists')
		expect(supabase.from).toHaveBeenNthCalledWith(5, 'companies')
		expect(result).toEqual({
			stats: {
				totalArtists: 12,
				activeArtists: 9,
				totalReleases: 20,
				recentReleases: 1,
				totalNews: 5,
				totalCompanies: 3,
				verifiedCompanies: 2,
			},
			recentArtists: [recentArtist],
			recentReleases: [
				{
					...recentRelease,
					artists: [recentArtist],
				},
				{
					...oldRelease,
					artists: [],
				},
			],
			recentNews: [
				{
					...recentNews,
					artists: [recentArtist],
				},
			],
		})
	})

	it('should map Supabase errors with the dashboard context', async () => {
		setupGlobals()

		const queries = [
			createSupabaseQueryMock({
				count: null,
				error: {
					code: '42P01',
					message: 'relation does not exist',
					details: 'missing table',
					hint: '',
				},
			}),
			createSupabaseQueryMock({ count: 0, error: null }),
			createSupabaseQueryMock({ count: 0, error: null }),
			createSupabaseQueryMock({ count: 0, error: null }),
			createSupabaseQueryMock({ data: [], error: null }),
			createSupabaseQueryMock({ data: [], error: null }),
			createSupabaseQueryMock({ data: [], error: null }),
			createSupabaseQueryMock({ data: [], error: null }),
		]
		const supabase = {
			from: vi.fn(() => {
				const query = queries.shift()

				if (!query) throw new Error('Unexpected Supabase query')

				return query
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()

		await expect(handler()).rejects.toMatchObject({
			statusCode: 500,
			data: {
				context: 'dashboard.overview',
			},
		})
	})
})
