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
	validateNumericArrayParam,
	validateOrderBy,
	validateOrderDirection,
	validatePageParam,
	validateSearchParam,
} from '#server/utils/validation'
import { transformJunction } from '#server/utils/transformers'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/musics/paginated.get'
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
	vi.stubGlobal('transformJunction', transformJunction)
	vi.stubGlobal('validateArrayParam', validateArrayParam)
	vi.stubGlobal('validateLimitParam', validateLimitParam)
	vi.stubGlobal('validateNumericArrayParam', validateNumericArrayParam)
	vi.stubGlobal('validateOrderBy', validateOrderBy)
	vi.stubGlobal('validateOrderDirection', validateOrderDirection)
	vi.stubGlobal('validatePageParam', validatePageParam)
	vi.stubGlobal('validateSearchParam', validateSearchParam)
}

describe('GET /api/musics/paginated', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('should apply standard music filters and flatten relations', async () => {
		setupGlobals({
			page: '1',
			limit: '2',
			search: 'love',
			years: '2025,2026',
			ismv: 'true',
			orderBy: 'name',
			orderDirection: 'asc',
		})

		const rawMusics = [
			{
				id: 'music-b',
				name: 'Love Theory',
				release_year: 2026,
				artists: [
					{
						artist: {
							id: 'artist-b',
							name: 'B Artist',
						},
					},
				],
				releases: [
					{
						release: {
							id: 'release-b',
							name: 'B Release',
						},
					},
				],
			},
			{
				id: 'music-a',
				name: 'Love Dive',
				release_year: 2025,
				artists: [
					{
						artist: {
							id: 'artist-a',
							name: 'A Artist',
						},
					},
				],
				releases: [
					{
						release: {
							id: 'release-a',
							name: 'A Release',
						},
					},
				],
			},
		]
		const dataQuery = createSupabaseQueryMock({
			data: rawMusics,
			error: null,
		})
		const countQuery = createSupabaseQueryMock({ count: 2, error: null })
		const supabase = {
			from: vi.fn((table: string) => {
				if (table !== 'musics') throw new Error(`Unexpected table: ${table}`)

				return supabase.from.mock.calls.length === 1 ? dataQuery : countQuery
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()
		const result = await handler({})

		expect(dataQuery.calls).toContainEqual({
			method: 'eq',
			args: ['artists.artist.verified', true],
		})
		expect(dataQuery.calls).toContainEqual({
			method: 'ilike',
			args: ['name', '%love%'],
		})
		expect(dataQuery.calls).toContainEqual({
			method: 'in',
			args: ['release_year', [2025, 2026]],
		})
		expect(dataQuery.calls).toContainEqual({
			method: 'eq',
			args: ['ismv', true],
		})
		expect(dataQuery.calls).toContainEqual({
			method: 'not',
			args: ['name', 'ilike', '%Instrumental%'],
		})
		expect(dataQuery.calls).toContainEqual({
			method: 'order',
			args: ['name', { ascending: true }],
		})
		expect(dataQuery.calls).toContainEqual({
			method: 'range',
			args: [0, 1],
		})
		expect(result).toEqual({
			musics: [
				{
					...rawMusics[1],
					artists: [
						{
							id: 'artist-a',
							name: 'A Artist',
						},
					],
					releases: [
						{
							id: 'release-a',
							name: 'A Release',
						},
					],
				},
				{
					...rawMusics[0],
					artists: [
						{
							id: 'artist-b',
							name: 'B Artist',
						},
					],
					releases: [
						{
							id: 'release-b',
							name: 'B Release',
						},
					],
				},
			],
			total: 2,
			page: 1,
			limit: 2,
			totalPages: 1,
		})
	})

	it('should use the optimized style RPC path and fetch relations for returned ids', async () => {
		setupGlobals({
			page: '2',
			limit: '3',
			styles: 'dance,pop',
			orderBy: 'release_year',
			orderDirection: 'desc',
			ismv: 'false',
		})

		const rawMusic = {
			id: 'music-id',
			name: 'Style Match',
			release_year: 2024,
			artists: [
				{
					artist: {
						id: 'artist-id',
						name: 'Styled Artist',
					},
				},
			],
			releases: [],
		}
		const dataQuery = createSupabaseQueryMock({
			data: [rawMusic],
			error: null,
		})
		const supabase = {
			rpc: vi.fn(async () => ({
				data: [{ id: 'music-id', total_count: 7 }],
				error: null,
			})),
			from: vi.fn(() => dataQuery),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()
		const result = await handler({})

		expect(supabase.rpc).toHaveBeenCalledWith('get_paginated_musics_by_styles', {
			style_filters: ['dance', 'pop'],
			search_term: undefined,
			year_filters: undefined,
			is_mv: false,
			order_column: 'release_year',
			order_dir: 'desc',
			page_limit: 3,
			page_offset: 3,
		})
		expect(dataQuery.calls).toContainEqual({
			method: 'eq',
			args: ['artists.artist.verified', true],
		})
		expect(dataQuery.calls).toContainEqual({
			method: 'in',
			args: ['id', ['music-id']],
		})
		expect(result).toEqual({
			musics: [
				{
					...rawMusic,
					artists: [
						{
							id: 'artist-id',
							name: 'Styled Artist',
						},
					],
					releases: [],
				},
			],
			total: 7,
			page: 2,
			limit: 3,
			totalPages: 3,
		})
	})

	it('should map Supabase errors with the musics pagination context', async () => {
		setupGlobals({})

		const dataQuery = createSupabaseQueryMock({
			data: [],
			error: null,
		})
		const countQuery = createSupabaseQueryMock({
			count: null,
			error: {
				code: '42703',
				message: 'column does not exist',
				details: 'missing column',
				hint: '',
			},
		})
		const supabase = {
			from: vi.fn((table: string) => {
				if (table !== 'musics') throw new Error(`Unexpected table: ${table}`)

				return supabase.from.mock.calls.length === 1 ? dataQuery : countQuery
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 500,
			data: {
				context: 'musics.paginated',
			},
		})
	})
})
