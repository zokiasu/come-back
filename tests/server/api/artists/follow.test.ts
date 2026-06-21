import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import { createNotFoundError, handleSupabaseError } from '#server/utils/errorHandler'

const setupCommonGlobals = (artistId = 'artist-id') => {
	vi.stubGlobal(
		'requireAuth',
		vi.fn(async () => ({ id: 'user-id' })),
	)
	vi.stubGlobal('setHeader', vi.fn())
	vi.stubGlobal(
		'getRouterParam',
		vi.fn(() => artistId),
	)
	vi.stubGlobal(
		'validateRouteParam',
		vi.fn(() => artistId),
	)
	vi.stubGlobal('createNotFoundError', createNotFoundError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
}

const loadFollowHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/artists/[id]/follow.post'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const loadUnfollowHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/artists/[id]/follow.delete'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const loadFollowedHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/artists/followed.get'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

describe('artist follow API', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('should follow an existing artist idempotently', async () => {
		setupCommonGlobals()

		const artistExistsQuery = createSupabaseQueryMock({
			data: { id: 'artist-id' },
			error: null,
		})
		const followQuery = createSupabaseQueryMock({ error: null })
		const supabase = {
			from: vi
				.fn()
				.mockReturnValueOnce(artistExistsQuery)
				.mockReturnValueOnce(followQuery),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadFollowHandler()

		await expect(handler({})).resolves.toEqual({ success: true })
		expect(artistExistsQuery.calls).toEqual([
			{ method: 'select', args: ['id'] },
			{ method: 'eq', args: ['id', 'artist-id'] },
		])
		expect(artistExistsQuery.maybeSingle).toHaveBeenCalledOnce()
		expect(followQuery.calls).toEqual([
			{
				method: 'upsert',
				args: [
					{ user_id: 'user-id', artist_id: 'artist-id' },
					{ onConflict: 'user_id,artist_id', ignoreDuplicates: true },
				],
			},
		])
	})

	it('should reject following a missing artist', async () => {
		setupCommonGlobals()

		const artistExistsQuery = createSupabaseQueryMock({
			data: null,
			error: null,
		})
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => artistExistsQuery),
		}))

		const handler = await loadFollowHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 404,
			statusMessage: 'Artist not found',
		})
	})

	it('should unfollow the artist only for the authenticated user', async () => {
		setupCommonGlobals()

		const deleteQuery = createSupabaseQueryMock({ error: null })
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => deleteQuery),
		}))

		const handler = await loadUnfollowHandler()

		await expect(handler({})).resolves.toEqual({ success: true })
		expect(deleteQuery.calls).toEqual([
			{ method: 'delete', args: [] },
			{ method: 'eq', args: ['user_id', 'user-id'] },
			{ method: 'eq', args: ['artist_id', 'artist-id'] },
		])
	})

	it('should list followed artists with their followed timestamp', async () => {
		setupCommonGlobals()

		const followedQuery = createSupabaseQueryMock({
			data: [
				{
					artist_id: 'artist-id',
					created_at: '2026-05-15T10:00:00.000Z',
					artists: {
						id: 'artist-id',
						name: 'aespa',
						image: 'https://example.com/aespa.jpg',
						verified: true,
						type: 'GROUP',
					},
				},
			],
			error: null,
		})
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => followedQuery),
		}))

		const handler = await loadFollowedHandler()

		await expect(handler({})).resolves.toEqual([
			{
				id: 'artist-id',
				name: 'aespa',
				image: 'https://example.com/aespa.jpg',
				verified: true,
				type: 'GROUP',
				followed_at: '2026-05-15T10:00:00.000Z',
			},
		])
		expect(followedQuery.calls).toEqual([
			{
				method: 'select',
				args: ['artist_id, created_at, artists!inner(id, name, image, verified, type)'],
			},
			{ method: 'eq', args: ['user_id', 'user-id'] },
			{ method: 'order', args: ['created_at', { ascending: false }] },
		])
	})
})
