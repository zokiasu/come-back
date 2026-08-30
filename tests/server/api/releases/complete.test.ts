import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { transformJunction } from '#server/utils/transformers'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/releases/[id]/complete.get')

	return module.default as (event: unknown) => Promise<unknown>
}

const setupSupabase = (results: Record<string, { data?: unknown; error?: unknown }>) => {
	const queries: Record<string, ReturnType<typeof createSupabaseQueryMock>> = {
		releases: createSupabaseQueryMock({
			data: results.releases?.data ?? null,
			error: results.releases?.error ?? null,
		}),
		artist_releases: createSupabaseQueryMock({
			data: results.artist_releases?.data ?? [],
			error: results.artist_releases?.error ?? null,
		}),
		music_releases: createSupabaseQueryMock({
			data: results.music_releases?.data ?? [],
			error: results.music_releases?.error ?? null,
		}),
	}
	const supabase = {
		from: vi.fn((table: string) => queries[table]),
	}

	vi.stubGlobal('useServerSupabase', () => supabase)

	return { queries, supabase }
}

const setupGlobals = () => {
	const setHeader = vi.fn()

	vi.stubGlobal('setHeader', setHeader)
	vi.stubGlobal(
		'getRouterParam',
		vi.fn(() => 'release-id'),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('transformJunction', transformJunction)

	return { setHeader }
}

describe('GET /api/releases/[id]/complete', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('only fetches the release when it is verified', async () => {
		setupGlobals()
		const { queries } = setupSupabase({
			releases: {
				data: { id: 'release-id', name: 'Armageddon', verified: true },
			},
			music_releases: {
				data: [{ music: { id: 'music-id', name: 'Supernova', verified: true } }],
			},
		})

		const handler = await loadHandler()
		const result = await handler({})

		expect(queries.releases!.eq).toHaveBeenCalledWith('id', 'release-id')
		expect(queries.releases!.eq).toHaveBeenCalledWith('verified', true)
		expect(queries.releases!.single).toHaveBeenCalled()
		expect(queries.artist_releases!.eq).toHaveBeenCalledWith('artist.verified', true)
		expect(queries.music_releases!.eq).toHaveBeenCalledWith('music.verified', true)

		const payload = result as {
			release: { id: string; name: string; musics: unknown[] }
		}
		expect(payload.release.id).toBe('release-id')
		expect(payload.release.musics).toEqual([
			{ id: 'music-id', name: 'Supernova', verified: true },
		])
	})

	it('returns 404 for an unverified (or missing) release', async () => {
		setupGlobals()
		setupSupabase({
			releases: {
				data: null,
				error: { code: 'PGRST116', message: 'no rows', details: '', hint: '' },
			},
		})

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 404,
			statusMessage: 'Release not found',
		})
	})
})
