import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { transformJunction } from '#server/utils/transformers'

type CalendarQueryResult = {
	data: unknown[] | null
	error: unknown
}

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/calendar/releases.get'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const setupSupabase = (result: CalendarQueryResult) => {
	const query = {
		select: vi.fn(() => query),
		eq: vi.fn(() => query),
		gte: vi.fn(() => query),
		lte: vi.fn(() => query),
		order: vi.fn(async () => result),
	}
	const supabase = {
		from: vi.fn(() => query),
	}

	vi.stubGlobal('useServerSupabase', () => supabase)

	return { query, supabase }
}

const setupGlobals = (query: Record<string, string | undefined>) => {
	const setHeader = vi.fn()

	vi.stubGlobal('setHeader', setHeader)
	vi.stubGlobal(
		'getQuery',
		vi.fn(() => query),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('transformJunction', transformJunction)

	return { setHeader }
}

describe('GET /api/calendar/releases', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('should reject an invalid month', async () => {
		setupGlobals({ month: '12', year: '2026' })
		setupSupabase({ data: [], error: null })

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
			statusMessage: 'Month must be between 0 and 11',
		})
	})

	it('should query the month range and flatten artist junctions', async () => {
		const rawRelease = {
			id: 'release-id',
			name: 'Armageddon',
			date: '2026-05-27',
			artists: [
				{
					artist: {
						id: 'artist-id',
						name: 'aespa',
					},
				},
			],
		}
		const { setHeader } = setupGlobals({ month: '4', year: '2026' })
		const { query, supabase } = setupSupabase({
			data: [rawRelease],
			error: null,
		})

		const handler = await loadHandler()
		const result = await handler({})

		expect(setHeader).toHaveBeenCalledWith(
			{},
			'Cache-Control',
			'public, max-age=86400, stale-while-revalidate=3600',
		)
		expect(supabase.from).toHaveBeenCalledWith('releases')
		expect(query.eq).toHaveBeenCalledWith('artists.artist.verified', true)
		expect(query.gte).toHaveBeenCalledWith('date', '2026-05-01')
		expect(query.lte).toHaveBeenCalledWith('date', '2026-05-31')
		expect(query.order).toHaveBeenCalledWith('date', { ascending: false })
		expect(result).toEqual([
			{
				...rawRelease,
				artists: [
					{
						id: 'artist-id',
						name: 'aespa',
					},
				],
			},
		])
	})

	it('should map Supabase errors with calendar context', async () => {
		setupGlobals({ month: '4', year: '2026' })
		setupSupabase({
			data: null,
			error: {
				code: '42P01',
				message: 'relation does not exist',
				details: 'missing table',
				hint: '',
			},
		})

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 500,
			data: {
				context: 'calendar.releases',
			},
		})
	})
})
