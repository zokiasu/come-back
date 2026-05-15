import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../../helpers/supabaseQuery'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../../server/api/admin/youtube/link-mv.post'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (body: unknown, youtubeApiKey?: string) => {
	const setHeader = vi.fn()

	vi.stubGlobal(
		'requireAdmin',
		vi.fn(async () => undefined),
	)
	vi.stubGlobal('setHeader', setHeader)
	vi.stubGlobal(
		'readBody',
		vi.fn(async () => body),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('useRuntimeConfig', () => ({
		public: {
			YOUTUBE_API_KEY: youtubeApiKey,
		},
	}))

	return { setHeader }
}

describe('POST /api/admin/youtube/link-mv', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-05-15T11:00:00Z'))
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should reject missing identifiers', async () => {
		setupGlobals({ musicId: 'music-id' })
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn() }))

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
			message: 'musicId and videoId are required',
		})
	})

	it('should reject invalid YouTube video ids before querying Supabase', async () => {
		setupGlobals({ musicId: 'music-id', videoId: 'invalid id!' })
		const supabase = { from: vi.fn() }
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
			message: 'videoId format is invalid',
		})
		expect(supabase.from).not.toHaveBeenCalled()
	})

	it('should reject videos already linked to another music', async () => {
		setupGlobals({ musicId: 'music-id', videoId: 'abc123XYZ' })

		const musicQuery = createSupabaseQueryMock({
			data: {
				id: 'music-id',
				name: 'Target Music',
				id_youtube_music: null,
				ismv: false,
			},
			error: null,
		})
		const duplicateQuery = createSupabaseQueryMock({
			data: {
				id: 'other-music-id',
				name: 'Already Linked',
			},
			error: null,
		})
		const supabase = {
			from: vi.fn().mockReturnValueOnce(musicQuery).mockReturnValueOnce(duplicateQuery),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 409,
			statusMessage: 'Conflict',
			message: 'This video is already linked to Already Linked',
		})
		expect(duplicateQuery.calls).toContainEqual({
			method: 'neq',
			args: ['id', 'music-id'],
		})
	})

	it('should link the video and mark the music as an MV', async () => {
		setupGlobals({ musicId: 'music-id', videoId: 'abc123XYZ' })

		const musicQuery = createSupabaseQueryMock({
			data: {
				id: 'music-id',
				name: 'Target Music',
				id_youtube_music: 'previous-id',
				ismv: false,
			},
			error: null,
		})
		const duplicateQuery = createSupabaseQueryMock({ data: null, error: null })
		const updatedMusic = {
			id: 'music-id',
			name: 'Target Music',
			id_youtube_music: 'abc123XYZ',
			ismv: true,
			duration: null,
			thumbnails: null,
		}
		const updateQuery = createSupabaseQueryMock({
			data: updatedMusic,
			error: null,
		})
		const supabase = {
			from: vi
				.fn()
				.mockReturnValueOnce(musicQuery)
				.mockReturnValueOnce(duplicateQuery)
				.mockReturnValueOnce(updateQuery),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()
		const result = await handler({})

		expect(updateQuery.calls).toEqual([
			{
				method: 'update',
				args: [
					{
						id_youtube_music: 'abc123XYZ',
						ismv: true,
						updated_at: '2026-05-15T11:00:00.000Z',
					},
				],
			},
			{ method: 'eq', args: ['id', 'music-id'] },
			{
				method: 'select',
				args: ['id, name, id_youtube_music, ismv, duration, thumbnails'],
			},
		])
		expect(updateQuery.single).toHaveBeenCalledOnce()
		expect(result).toEqual({
			success: true,
			music: updatedMusic,
			replacedPreviousYoutubeId: 'previous-id',
		})
	})
})
