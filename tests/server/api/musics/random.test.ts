import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'

type SupabaseResult = {
	data?: unknown[] | null
	error?: unknown
}

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/musics/random.get')

	return module.default as (event: unknown) => Promise<unknown>
}

const createRawMusic = (id: string, artistId: string) => ({
	id,
	name: `Music ${id}`,
	id_youtube_music: `youtube-${id}`,
	date: '2026-06-02',
	artists: [
		{
			artist: {
				id: artistId,
				name: `Artist ${artistId}`,
				image: null,
			},
		},
	],
	releases: [
		{
			release: {
				id: `release-${id}`,
				name: `Release ${id}`,
			},
		},
	],
})

const setupSupabase = ({
	rpcResults,
	queryResults = [],
}: {
	rpcResults: SupabaseResult[]
	queryResults?: SupabaseResult[]
}) => {
	let rpcIndex = 0
	const rpc = vi.fn(async () => {
		const result = rpcResults[rpcIndex++] ?? { data: null, error: null }
		return {
			data: result.data ?? null,
			error: result.error ?? null,
		}
	})
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
	const supabase = { from, rpc }

	vi.stubGlobal('useServerSupabase', () => supabase)

	return { queries, supabase }
}

const setupGlobals = (query: Record<string, unknown> = {}) => {
	const setHeader = vi.fn()

	vi.stubGlobal(
		'getQuery',
		vi.fn(() => query),
	)
	vi.stubGlobal('setHeader', setHeader)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)

	return { setHeader }
}

describe('GET /api/musics/random', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('samples IDs with the RPC, fetches them with verified relations, and flattens them', async () => {
		const rawMusic = createRawMusic('music-1', 'artist-1')
		const { setHeader } = setupGlobals({ limit: '1' })
		const { queries, supabase } = setupSupabase({
			rpcResults: [{ data: [{ id: rawMusic.id }] }],
			queryResults: [{ data: [rawMusic] }],
		})

		const handler = await loadHandler()
		const result = await handler({})

		expect(supabase.rpc).toHaveBeenCalledOnce()
		expect(supabase.rpc).toHaveBeenCalledWith('get_random_discover_music_ids', {
			count_param: 3,
		})
		expect(supabase.from).toHaveBeenCalledOnce()
		expect(supabase.from).toHaveBeenCalledWith('musics')
		expect(queries[0]?.in).toHaveBeenCalledWith('id', ['music-1'])
		expect(queries[0]?.eq).toHaveBeenCalledWith('verified', true)
		expect(queries[0]?.eq).toHaveBeenCalledWith('artists.artist.verified', true)
		expect(queries[0]?.eq).toHaveBeenCalledWith('releases.release.verified', true)
		expect(queries[0]?.select).toHaveBeenCalledWith(
			expect.stringContaining('artists:music_artists!inner'),
		)
		expect(queries[0]?.select).toHaveBeenCalledWith(
			expect.stringContaining('releases:music_releases!inner'),
		)
		expect(setHeader).toHaveBeenCalledWith(
			{},
			'Cache-Control',
			'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
		)
		expect(result).toEqual([
			{
				...rawMusic,
				artists: [rawMusic.artists[0]?.artist],
				releases: [rawMusic.releases[0]?.release],
			},
		])
	})

	it('caps oversampling at 60 IDs for the maximum limit', async () => {
		const ids = Array.from({ length: 60 }, (_, index) => `music-${index + 1}`)
		const musics = ids
			.slice(0, 20)
			.map((id, index) => createRawMusic(id, `artist-${index}`))
		setupGlobals({ limit: '20' })
		const { supabase } = setupSupabase({
			rpcResults: [{ data: ids.map((id) => ({ id })) }],
			queryResults: [{ data: musics }],
		})

		const handler = await loadHandler()
		const result = await handler({})

		expect(supabase.rpc).toHaveBeenCalledOnce()
		expect(supabase.rpc).toHaveBeenCalledWith('get_random_discover_music_ids', {
			count_param: 60,
		})
		expect(result).toHaveLength(20)
	})

	it('deduplicates sampled IDs and preserves the RPC order', async () => {
		const firstMusic = createRawMusic('music-1', 'artist-1')
		const secondMusic = createRawMusic('music-2', 'artist-2')
		const thirdMusic = createRawMusic('music-3', 'artist-3')
		setupGlobals({ limit: '3' })
		const { queries, supabase } = setupSupabase({
			rpcResults: [
				{
					data: [
						{ id: 'music-3' },
						{ id: 'music-1' },
						{ id: 'music-3' },
						{ id: 'music-2' },
					],
				},
			],
			queryResults: [{ data: [firstMusic, secondMusic, thirdMusic] }],
		})

		const handler = await loadHandler()
		const result = (await handler({})) as Array<{ id: string }>

		expect(supabase.rpc).toHaveBeenCalledOnce()
		expect(supabase.from).toHaveBeenCalledOnce()
		expect(queries[0]?.in).toHaveBeenCalledWith('id', ['music-3', 'music-1', 'music-2'])
		expect(result.map((music) => music.id)).toEqual(['music-3', 'music-1', 'music-2'])
	})

	it('returns an empty list without querying the table when no eligible ID is sampled', async () => {
		setupGlobals({ limit: '4' })
		const { supabase } = setupSupabase({
			rpcResults: [{ data: [] }, { data: [{ id: 'unexpected' }] }],
		})

		const handler = await loadHandler()
		const result = await handler({})

		expect(result).toEqual([])
		expect(supabase.rpc).toHaveBeenCalledOnce()
		expect(supabase.from).not.toHaveBeenCalled()
	})

	it('prefers different artists before backfilling repeated artists', async () => {
		const firstArtistTrack = createRawMusic('music-a1', 'artist-a')
		const repeatedArtistTrack = createRawMusic('music-a2', 'artist-a')
		const otherArtistTrack = createRawMusic('music-b1', 'artist-b')
		setupGlobals({ limit: '2' })
		setupSupabase({
			rpcResults: [
				{
					data: [
						{ id: firstArtistTrack.id },
						{ id: repeatedArtistTrack.id },
						{ id: otherArtistTrack.id },
					],
				},
			],
			queryResults: [{ data: [firstArtistTrack, repeatedArtistTrack, otherArtistTrack] }],
		})

		const handler = await loadHandler()
		const result = (await handler({})) as Array<{ id: string }>

		expect(result.map((music) => music.id)).toEqual(['music-a1', 'music-b1'])
	})

	it('uses no-store only for an explicit fresh request', async () => {
		const rawMusic = createRawMusic('music-1', 'artist-1')
		const { setHeader } = setupGlobals({ limit: '1', fresh: 'true' })
		setupSupabase({
			rpcResults: [{ data: [{ id: rawMusic.id }] }],
			queryResults: [{ data: [rawMusic] }],
		})

		const handler = await loadHandler()
		await handler({})

		expect(setHeader).toHaveBeenCalledWith({}, 'Cache-Control', 'no-store')
	})

	it.each(['1', 'yes', 'TRUE', ['true']])(
		'rejects an invalid fresh value: %j',
		async (fresh) => {
			const { setHeader } = setupGlobals({ fresh })
			const { supabase } = setupSupabase({ rpcResults: [] })
			const handler = await loadHandler()

			await expect(handler({})).rejects.toMatchObject({
				statusCode: 400,
				statusMessage: 'Bad Request',
			})
			expect(setHeader).not.toHaveBeenCalled()
			expect(supabase.rpc).not.toHaveBeenCalled()
			expect(supabase.from).not.toHaveBeenCalled()
		},
	)

	it('maps RPC errors through the Supabase error handler without querying the table', async () => {
		const { setHeader } = setupGlobals({ limit: '1' })
		const { supabase } = setupSupabase({
			rpcResults: [
				{
					error: {
						code: '42883',
						message: 'RPC is unavailable',
						details: 'Function not found',
						hint: '',
					},
				},
			],
		})

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 500,
			data: {
				code: '42883',
				context: 'musics.random.rpc',
			},
		})
		expect(supabase.rpc).toHaveBeenCalledOnce()
		expect(supabase.from).not.toHaveBeenCalled()
		expect(setHeader).toHaveBeenCalledOnce()
		expect(setHeader).toHaveBeenCalledWith({}, 'Cache-Control', 'no-store')
	})

	it('stops immediately and maps errors from the filtered music query', async () => {
		const { setHeader } = setupGlobals({ limit: '1' })
		const { supabase } = setupSupabase({
			rpcResults: [{ data: [{ id: 'music-1' }] }],
			queryResults: [
				{
					error: {
						code: '42P01',
						message: 'Table is unavailable',
						details: 'Missing table',
						hint: '',
					},
				},
			],
		})

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 500,
			data: {
				code: '42P01',
				context: 'musics.random',
			},
		})
		expect(supabase.rpc).toHaveBeenCalledOnce()
		expect(supabase.from).toHaveBeenCalledOnce()
		expect(setHeader).toHaveBeenCalledOnce()
		expect(setHeader).toHaveBeenCalledWith({}, 'Cache-Control', 'no-store')
	})

	it.each(['invalid', '0', '21', '4items', '1.5', '9007199254740992'])(
		'rejects an invalid or unsafe limit: %s',
		async (limit) => {
			const { setHeader } = setupGlobals({ limit })
			const { supabase } = setupSupabase({ rpcResults: [] })

			const handler = await loadHandler()

			await expect(handler({})).rejects.toMatchObject({
				statusCode: 400,
				statusMessage: 'Bad Request',
			})
			expect(setHeader).not.toHaveBeenCalled()
			expect(supabase.rpc).not.toHaveBeenCalled()
			expect(supabase.from).not.toHaveBeenCalled()
		},
	)
})
