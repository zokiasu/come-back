import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { transformJunction } from '#server/utils/transformers'
import { validateLimitParam } from '#server/utils/validation'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/musics/latest-mvs.get')

	return module.default as (event: unknown) => Promise<unknown>
}

const setupSupabase = (result: { data?: unknown[] | null; error?: unknown }) => {
	const query = createSupabaseQueryMock({
		data: result.data ?? null,
		error: result.error ?? null,
	})
	const supabase = {
		from: vi.fn(() => query),
	}

	vi.stubGlobal('useServerSupabase', () => supabase)

	return { query, supabase }
}

const setupGlobals = () => {
	const setHeader = vi.fn()

	vi.stubGlobal('setHeader', setHeader)
	vi.stubGlobal(
		'getQuery',
		vi.fn(() => ({})),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('transformJunction', transformJunction)
	vi.stubGlobal('validateLimitParam', validateLimitParam)

	return { setHeader }
}

describe('GET /api/musics/latest-mvs', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('only queries verified MVs and flattens artist junctions', async () => {
		const rawMusic = {
			id: 'music-id',
			name: 'Supernova',
			ismv: true,
			artists: [{ artist: { id: 'artist-id', name: 'aespa' } }],
		}
		setupGlobals()
		const { query, supabase } = setupSupabase({ data: [rawMusic] })

		const handler = await loadHandler()
		const result = await handler({})

		expect(supabase.from).toHaveBeenCalledWith('musics')
		expect(query.eq).toHaveBeenCalledWith('ismv', true)
		expect(query.eq).toHaveBeenCalledWith('verified', true)
		expect(query.eq).toHaveBeenCalledWith('artists.artist.verified', true)
		expect(result).toEqual([
			{
				...rawMusic,
				artists: [{ id: 'artist-id', name: 'aespa' }],
			},
		])
	})
})
