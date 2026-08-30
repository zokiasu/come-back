import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/musics/random.get')

	return module.default as (event: unknown) => Promise<unknown>
}

const setupSupabase = (result: {
	data?: unknown[] | null
	error?: unknown
	count?: number | null
}) => {
	const query = createSupabaseQueryMock({
		data: result.data ?? null,
		error: result.error ?? null,
		count: result.count ?? 0,
	})
	const supabase = {
		from: vi.fn(() => query),
	}

	vi.stubGlobal('useServerSupabase', () => supabase)

	return { query, supabase }
}

const setupGlobals = (query: Record<string, string> = {}) => {
	vi.stubGlobal(
		'getQuery',
		vi.fn(() => query),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
}

describe('GET /api/musics/random', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('applies the verified filter to both the count and the data queries', async () => {
		const rawMusic = {
			id: 'music-id',
			name: 'Supernova',
			id_youtube_music: 'yt-1',
			date: '2026-06-02',
			artists: [{ artist: { id: 'artist-id', name: 'aespa' } }],
			releases: [{ release: { id: 'release-id', name: 'Armageddon' } }],
		}
		setupGlobals()
		const { query, supabase } = setupSupabase({ data: [rawMusic], count: 1 })

		const handler = await loadHandler()
		const result = await handler({})

		expect(supabase.from).toHaveBeenCalledWith('musics')
		expect(query.eq).toHaveBeenCalledWith('verified', true)
		expect(query.eq).toHaveBeenCalledWith('artists.artist.verified', true)
		expect(query.eq).toHaveBeenCalledWith('releases.release.verified', true)
		expect(query.select).toHaveBeenCalledWith(expect.stringContaining('releases!inner'))
		expect(result).toEqual([
			{
				...rawMusic,
				artists: [{ id: 'artist-id', name: 'aespa' }],
				releases: [{ id: 'release-id', name: 'Armageddon' }],
			},
		])
	})

	it.each(['invalid', '0', '21', '4items'])(
		'rejects an invalid or unsafe limit: %s',
		async (limit) => {
			setupGlobals({ limit })
			const { supabase } = setupSupabase({ data: [], count: 1 })

			const handler = await loadHandler()

			await expect(handler({})).rejects.toMatchObject({
				statusCode: 400,
				statusMessage: 'Bad Request',
			})
			expect(supabase.from).not.toHaveBeenCalled()
		},
	)
})
