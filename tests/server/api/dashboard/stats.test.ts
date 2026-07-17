import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import {
	createInternalError,
	handleSupabaseError,
	isPostgrestError,
} from '#server/utils/errorHandler'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/dashboard/stats.post'
	const module = await import(modulePath)

	return module.default as () => Promise<unknown>
}

const setupGlobals = (body: unknown) => {
	const setHeader = vi.fn()
	vi.stubGlobal(
		'requireAdmin',
		vi.fn(async () => ({ id: 'admin-id', role: 'ADMIN' })),
	)
	vi.stubGlobal('setHeader', setHeader)
	vi.stubGlobal(
		'readBody',
		vi.fn(async () => body),
	)
	vi.stubGlobal('createInternalError', createInternalError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('isPostgrestError', isPostgrestError)

	return { setHeader }
}

const createRpcResponse = <TData>(data: TData) => Promise.resolve({ data, error: null })

describe('POST /api/dashboard/stats', () => {
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

	it('should return dashboard stats aggregated from RPCs', async () => {
		const filters = { period: 'all' as const }
		const { setHeader } = setupGlobals(filters)

		const supabase = {
			rpc: vi.fn((name: string) => {
				switch (name) {
					case 'get_general_stats':
						return createRpcResponse([
							{
								total_artists: 100,
								active_artists: 80,
								inactive_artists: 20,
								total_releases: 250,
								total_musics: 1200,
								total_companies: 15,
							},
						])
					case 'get_artist_demographics':
						return createRpcResponse([
							{ stat_type: 'TYPE', category: 'SOLO', count_value: 40 },
							{ stat_type: 'TYPE', category: 'GROUP', count_value: 60 },
							{ stat_type: 'GENDER', category: 'MALE', count_value: 45 },
							{ stat_type: 'GENDER', category: 'FEMALE', count_value: 55 },
							{ stat_type: 'STATUS', category: 'ACTIVE', count_value: 80 },
						])
					case 'get_top_artists_by_releases':
						return createRpcResponse([
							{ artist_id: 'a1', artist_name: 'BTS', release_count: 30 },
						])
					case 'get_top_artists_by_musics':
						return createRpcResponse([
							{ artist_id: 'a2', artist_name: 'BLACKPINK', music_count: 50 },
						])
					case 'get_releases_temporal_stats':
						return createRpcResponse([
							{ period_label: '2026-05', period_date: '2026-05-01', count_value: 10 },
						])
					case 'get_musics_temporal_stats_with_fallback':
						return createRpcResponse([
							{ period_label: '2026-05', period_date: '2026-05-01', count_value: 40 },
						])
					default:
						return createRpcResponse([])
				}
			}),
			from: vi.fn((table: string) => {
				if (table === 'artists') {
					return createSupabaseQueryMock({
						data: [
							{
								type: 'SOLO',
								gender: 'FEMALE',
								styles: ['K-Pop', 'Pop'],
								image: 'https://example.com/artist.jpg',
								description: 'Complete profile',
								birth_date: '2000-01-01',
								debut_date: '2020-01-01',
								general_tags: ['idol'],
							},
							{
								type: 'GROUP',
								gender: 'MIXTE',
								styles: ['K-Pop'],
								image: null,
								description: null,
								birth_date: null,
								debut_date: null,
								general_tags: [],
							},
						],
						error: null,
					})
				}

				if (table === 'artist_companies') {
					return createSupabaseQueryMock({
						data: [
							{
								artist_id: 'a1',
								company_id: 'c1',
								relationship_type: 'LABEL',
								companies: { name: 'HYBE' },
							},
						],
						error: null,
					})
				}

				throw new Error(`Unexpected table: ${table}`)
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()
		const result = await handler()

		expect(supabase.rpc).toHaveBeenCalledWith('get_general_stats', {
			start_date: undefined,
			end_date: undefined,
			filter_year: undefined,
		})
		expect(supabase.rpc).toHaveBeenCalledWith('get_artist_demographics')
		expect(supabase.rpc).toHaveBeenCalledWith('get_top_artists_by_releases', {
			start_date: undefined,
			end_date: undefined,
			filter_year: undefined,
			limit_count: 10,
		})
		expect(supabase.rpc).toHaveBeenCalledWith('get_top_artists_by_musics', {
			start_date: undefined,
			end_date: undefined,
			filter_year: undefined,
			limit_count: 10,
		})
		expect(setHeader).toHaveBeenCalledWith(
			undefined,
			'Cache-Control',
			'private, no-store',
		)

		expect(result).toMatchObject({
			general: {
				title: 'Overview',
				cards: expect.arrayContaining([
					expect.objectContaining({ title: 'Total Artists', value: 100 }),
					expect.objectContaining({ title: 'Total Releases', value: 250 }),
					expect.objectContaining({ title: 'Total Tracks', value: 1200 }),
					expect.objectContaining({ title: 'Total Companies', value: 15 }),
				]),
			},
			artists: {
				title: 'Artist Statistics',
				cards: expect.arrayContaining([
					expect.objectContaining({ title: 'Solo Artists', value: 40 }),
					expect.objectContaining({ title: 'Groups', value: 60 }),
					expect.objectContaining({ title: 'Completed Profiles', value: '50%' }),
				]),
				charts: expect.arrayContaining([
					expect.objectContaining({
						title: 'Profile Quality',
						data: expect.objectContaining({ data: [100, 50, 50] }),
					}),
				]),
			},
			companies: {
				title: 'Company Statistics',
				topLists: expect.arrayContaining([
					expect.objectContaining({
						title: 'Top Companies',
						items: expect.arrayContaining([
							expect.objectContaining({ name: 'HYBE', value: 1 }),
						]),
					}),
				]),
			},
			music: {
				title: 'Music Statistics',
			},
		})
	})

	it('should compute date range for weekly period', async () => {
		const filters = { period: 'week' as const }
		setupGlobals(filters)

		const supabase = {
			rpc: vi.fn(() => createRpcResponse([])),
			from: vi.fn((table: string) => {
				if (table === 'artists') {
					return createSupabaseQueryMock({ data: [], error: null })
				}
				if (table === 'artist_companies') {
					return createSupabaseQueryMock({ data: [], error: null })
				}
				throw new Error(`Unexpected table: ${table}`)
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()
		await handler()

		expect(supabase.rpc).toHaveBeenCalledWith('get_general_stats', {
			start_date: '2026-05-08T12:00:00.000Z',
			end_date: '2026-05-15T12:00:00.000Z',
			filter_year: undefined,
		})
	})

	it('should reject invalid filter payloads', async () => {
		setupGlobals({ period: 'invalid' })

		const supabase = {
			rpc: vi.fn(() => createRpcResponse([])),
			from: vi.fn((table: string) => {
				if (table === 'artists') {
					return createSupabaseQueryMock({ data: [], error: null })
				}
				if (table === 'artist_companies') {
					return createSupabaseQueryMock({ data: [], error: null })
				}
				throw new Error(`Unexpected table: ${table}`)
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()

		await expect(handler()).rejects.toMatchObject({
			statusCode: 400,
			statusMessage: 'Bad Request',
		})
	})
})
