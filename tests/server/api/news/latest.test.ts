import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { transformJunction } from '#server/utils/transformers'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/news/latest.get')

	return module.default as (event: unknown) => Promise<unknown>
}

const setupSupabase = (result: { data?: unknown[] | null; error?: unknown }) => {
	const query = createSupabaseQueryMock({ data: result.data ?? null, error: result.error ?? null })
	const supabase = {
		from: vi.fn(() => query),
	}

	vi.stubGlobal('useServerSupabase', () => supabase)

	return { query, supabase }
}

const setupGlobals = () => {
	const setHeader = vi.fn()

	vi.stubGlobal('setHeader', setHeader)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('transformJunction', transformJunction)

	return { setHeader }
}

describe('GET /api/news/latest', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('only queries verified news and flattens artist junctions', async () => {
		const rawNews = {
			id: 'news-id',
			message: 'aespa comeback',
			date: '2026-06-03T00:00:00.000Z',
			verified: true,
			artists: [{ artist: { id: 'artist-id', name: 'aespa' } }],
		}
		setupGlobals()
		const { query, supabase } = setupSupabase({ data: [rawNews] })

		const handler = await loadHandler()
		const result = await handler({})

		expect(supabase.from).toHaveBeenCalledWith('news')
		expect(query.eq).toHaveBeenCalledWith('verified', true)
		expect(query.eq).toHaveBeenCalledWith('artists.artist.verified', true)
		expect(query.gte).toHaveBeenCalledWith('date', expect.any(String))
		expect(result).toEqual([
			{
				...rawNews,
				artists: [{ id: 'artist-id', name: 'aespa' }],
			},
		])
	})
})
