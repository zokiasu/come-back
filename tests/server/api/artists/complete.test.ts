import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	createInternalError,
	handleSupabaseError,
	isPostgrestError,
} from '#server/utils/errorHandler'
import { transformJunction } from '#server/utils/transformers'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/artists/[id]/complete.get')

	return module.default as (event: unknown) => Promise<unknown>
}

const setupSupabase = (results: Record<string, { data?: unknown; error?: unknown }>) => {
	const queries: Record<string, ReturnType<typeof createSupabaseQueryMock>> = {
		artists: createSupabaseQueryMock({
			data: results.artists?.data ?? null,
			error: results.artists?.error ?? null,
		}),
		artist_relations: createSupabaseQueryMock({ data: [], error: null }),
		artist_releases: createSupabaseQueryMock({ data: [], error: null }),
		artist_companies: createSupabaseQueryMock({ data: [], error: null }),
		artist_social_links: createSupabaseQueryMock({ data: [], error: null }),
		artist_platform_links: createSupabaseQueryMock({ data: [], error: null }),
	}
	const supabase = {
		from: vi.fn((table: string) => queries[table]),
		rpc: vi.fn(async () => ({ data: [], error: null })),
	}

	vi.stubGlobal('useServerSupabase', () => supabase)

	return { queries, supabase }
}

const setupGlobals = () => {
	vi.stubGlobal(
		'getRouterParam',
		vi.fn(() => 'artist-id'),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('transformJunction', transformJunction)
	vi.stubGlobal('isPostgrestError', isPostgrestError)
	vi.stubGlobal('createInternalError', createInternalError)
}

describe('GET /api/artists/[id]/complete', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('only exposes verified artists and verified relations', async () => {
		setupGlobals()
		const { queries } = setupSupabase({
			artists: {
				data: { id: 'artist-id', name: 'aespa', verified: true },
			},
		})

		const handler = await loadHandler()
		const result = await handler({})

		expect(queries.artists!.eq).toHaveBeenCalledWith('id', 'artist-id')
		expect(queries.artists!.eq).toHaveBeenCalledWith('verified', true)
		expect(queries.artist_relations!.eq).toHaveBeenCalledWith('group.verified', true)
		expect(queries.artist_relations!.eq).toHaveBeenCalledWith('member.verified', true)
		expect(queries.artist_releases!.eq).toHaveBeenCalledWith('release.verified', true)
		expect(queries.artist_companies!.select).toHaveBeenCalledWith(
			'*, company:companies!inner(*)',
		)
		expect(queries.artist_companies!.eq).toHaveBeenCalledWith('company.verified', true)

		const payload = result as {
			artist: { id: string; name: string; groups: unknown[]; members: unknown[] }
			random_musics: unknown[]
		}
		expect(payload.artist.id).toBe('artist-id')
		expect(payload.artist.groups).toEqual([])
		expect(payload.artist.members).toEqual([])
		expect(payload.random_musics).toEqual([])
	})

	it('returns 404 for an unverified (or missing) artist', async () => {
		setupGlobals()
		setupSupabase({
			artists: {
				data: null,
				error: { code: 'PGRST116', message: 'no rows', details: '', hint: '' },
			},
		})

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 404,
			statusMessage: 'Artist not found',
		})
	})
})
