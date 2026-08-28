import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { applyMusicNameExclusions } from '#server/utils/queryFilters'
import { validateIntegerParam, validateSearchParam } from '#server/utils/validation'
import { transformJunction } from '#server/utils/transformers'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'

const setupGlobals = () => {
	vi.stubGlobal(
		'getQuery',
		vi.fn(() => ({ search: 'aespa', limit: '8' })),
	)
	vi.stubGlobal('setHeader', vi.fn())
	vi.stubGlobal('checkRateLimit', vi.fn())
	vi.stubGlobal('RATE_LIMIT_PRESETS', { search: { limit: 30, windowMs: 60_000 } })
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('validateIntegerParam', validateIntegerParam)
	vi.stubGlobal('validateSearchParam', validateSearchParam)
	vi.stubGlobal('transformJunction', transformJunction)
	vi.stubGlobal('applyMusicNameExclusions', applyMusicNameExclusions)
}

describe('public catalog search', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		setupGlobals()
	})

	it('filters both releases and their artists to verified rows', async () => {
		const query = createSupabaseQueryMock({ data: [], count: 0, error: null })
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn(() => query) }))
		vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
		const module = await import('../../../../server/api/search/releases.get')
		const handler = module.default as (event: unknown) => Promise<unknown>

		await handler({})

		expect(query.calls).toContainEqual({ method: 'eq', args: ['verified', true] })
		expect(query.calls).toContainEqual({
			method: 'eq',
			args: ['artists.artist.verified', true],
		})
	})

	it('filters both musics and their artists to verified rows', async () => {
		const query = createSupabaseQueryMock({ data: [], count: 0, error: null })
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn(() => query) }))
		vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
		const module = await import('../../../../server/api/search/musics.get')
		const handler = module.default as (event: unknown) => Promise<unknown>

		await handler({})

		expect(query.calls).toContainEqual({ method: 'eq', args: ['verified', true] })
		expect(query.calls).toContainEqual({
			method: 'eq',
			args: ['artists.artist.verified', true],
		})
		expect(query.calls.filter(({ method }) => method === 'not')).toHaveLength(7)
	})
})
