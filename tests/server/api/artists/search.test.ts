import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type ArtistSearchResult = {
	id: string
	name: string
	verified: boolean
}

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/artists/search.get'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (query: Record<string, string | undefined>) => {
	const setHeader = vi.fn()

	vi.stubGlobal(
		'getQuery',
		vi.fn(() => query),
	)
	vi.stubGlobal('setHeader', setHeader)
	vi.stubGlobal('createError', createError)

	return { setHeader }
}

const mockSupabaseModule = (supabase: unknown) => {
	const useServerSupabase = vi.fn(() => supabase)

	vi.doMock('../../../../server/utils/supabase', () => ({
		useServerSupabase,
	}))

	return { useServerSupabase }
}

const createFallbackQuery = (result: {
	data: ArtistSearchResult[] | null
	error: Error | null
}) => {
	const query = {
		select: vi.fn(() => query),
		eq: vi.fn(() => query),
		ilike: vi.fn(() => query),
		order: vi.fn(() => query),
		limit: vi.fn(() => query),
		then: (resolve: (value: typeof result) => unknown) =>
			Promise.resolve(result).then(resolve),
	}

	return query
}

describe('GET /api/artists/search', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
	})

	it('should return no artists for searches shorter than two characters', async () => {
		setupGlobals({ search: ' a ', limit: '5' })
		const { useServerSupabase } = mockSupabaseModule({
			rpc: vi.fn(),
		})

		const handler = await loadHandler()
		const result = await handler({})

		expect(result).toEqual({ artists: [] })
		expect(useServerSupabase).not.toHaveBeenCalled()
	})

	it('should normalize search input and call the full-text RPC', async () => {
		const artists = [
			{
				id: 'artist-id',
				name: 'NewJeans',
				verified: true,
			},
		]
		setupGlobals({ search: '  new   jeans  ', limit: '5', type: 'group' })
		const supabase = {
			rpc: vi.fn(async () => ({ data: artists, error: null })),
		}
		mockSupabaseModule(supabase)

		const handler = await loadHandler()
		const result = await handler({})

		expect(supabase.rpc).toHaveBeenCalledWith('search_artists_fulltext', {
			search_query: 'new jeans',
			result_limit: 5,
			artist_type: 'GROUP',
		})
		expect(result).toEqual({ artists })
	})

	it('should fall back to verified artist ILIKE search when the RPC fails', async () => {
		const artists = [
			{
				id: 'artist-id',
				name: 'aespa',
				verified: true,
			},
		]
		setupGlobals({ search: 'aespa', limit: '3', type: 'solo' })
		const fallbackQuery = createFallbackQuery({ data: artists, error: null })
		const supabase = {
			rpc: vi.fn(async () => ({
				data: null,
				error: new Error('RPC unavailable'),
			})),
			from: vi.fn(() => fallbackQuery),
		}
		mockSupabaseModule(supabase)

		const handler = await loadHandler()
		const result = await handler({})

		expect(supabase.from).toHaveBeenCalledWith('artists')
		expect(fallbackQuery.select).toHaveBeenCalledWith(
			'id, name, image, description, verified',
		)
		expect(fallbackQuery.eq).toHaveBeenCalledWith('verified', true)
		expect(fallbackQuery.eq).toHaveBeenCalledWith('type', 'SOLO')
		expect(fallbackQuery.ilike).toHaveBeenCalledWith('name', '%aespa%')
		expect(fallbackQuery.order).toHaveBeenCalledWith('name', { ascending: true })
		expect(fallbackQuery.limit).toHaveBeenCalledWith(3)
		expect(result).toEqual({ artists })
	})
})
