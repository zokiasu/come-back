import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/musics/year-range.get')

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (queryResults: Array<{ data?: unknown; error?: unknown }>) => {
	const queries = queryResults.map((result) =>
		createSupabaseQueryMock({
			data: result.data ?? null,
			error: result.error ?? null,
		}),
	)
	let queryIndex = 0
	const from = vi.fn(() => {
		const query = queries[queryIndex++]
		if (!query) throw new Error('Unexpected Supabase table query')
		return query
	})
	const supabase = { from }

	vi.stubGlobal('useServerSupabase', () => supabase)
	vi.stubGlobal('setHeader', vi.fn())
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal(
		'getRequestIP',
		vi.fn(() => '127.0.0.1'),
	)

	return { from, queries }
}

describe('GET /api/musics/year-range', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('returns the oldest and newest release years of the public catalog', async () => {
		const { from, queries } = setupGlobals([
			{ data: { release_year: 2014 } },
			{ data: { release_year: 2026 } },
		])

		const handler = await loadHandler()
		const result = await handler({})

		expect(from).toHaveBeenCalledTimes(2)
		expect(queries[0]?.not).toHaveBeenCalledWith('release_year', 'is', null)
		expect(queries[0]?.order).toHaveBeenCalledWith('release_year', { ascending: true })
		expect(queries[1]?.order).toHaveBeenCalledWith('release_year', { ascending: false })
		expect(result).toEqual({ minYear: 2014, maxYear: 2026 })
	})

	it('returns null years when the catalog is empty', async () => {
		setupGlobals([{ data: null }, { data: null }])

		const handler = await loadHandler()
		const result = await handler({})

		expect(result).toEqual({ minYear: null, maxYear: null })
	})

	it('rejects out-of-range years returned by the database', async () => {
		setupGlobals([{ data: { release_year: 1200 } }, { data: { release_year: 40000 } }])

		const handler = await loadHandler()
		const result = await handler({})

		expect(result).toEqual({ minYear: null, maxYear: null })
	})
})
