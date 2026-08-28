import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import {
	createBadRequestError,
	createNotFoundError,
	handleSupabaseError,
} from '#server/utils/errorHandler'

const loadCreateHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/rankings/index.post')
	return module.default as (event: unknown) => Promise<unknown>
}

const loadUpdateHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/rankings/[id]/index.patch')
	return module.default as (event: unknown) => Promise<unknown>
}

const loadPublicDetailHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/rankings/[id]/index.get')
	return module.default as (event: unknown) => Promise<unknown>
}

const loadReorderHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/rankings/[id]/items/reorder.put')
	return module.default as (event: unknown) => Promise<unknown>
}

const setupCommonGlobals = (body: unknown = undefined) => {
	vi.stubGlobal(
		'requireAuth',
		vi.fn(async () => ({ id: '00000000-0000-4000-8000-000000000001', role: 'USER' })),
	)
	vi.stubGlobal(
		'readBody',
		vi.fn(async () => body),
	)
	vi.stubGlobal(
		'validateRouteParam',
		vi.fn(() => '00000000-0000-4000-8000-000000000010'),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('createBadRequestError', createBadRequestError)
	vi.stubGlobal('createNotFoundError', createNotFoundError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
}

describe('rankings API', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-08-28T12:00:00Z'))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('creates a private ranking for the authenticated user', async () => {
		setupCommonGlobals({ name: 'My top tracks', description: 'Favorites' })
		const saved = {
			id: 'ranking-id',
			user_id: '00000000-0000-4000-8000-000000000001',
			name: 'My top tracks',
			is_public: false,
		}
		const query = createSupabaseQueryMock({ data: saved, error: null })
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn(() => query) }))

		const handler = await loadCreateHandler()

		await expect(handler({})).resolves.toEqual(saved)
		expect(query.insert).toHaveBeenCalledWith({
			user_id: '00000000-0000-4000-8000-000000000001',
			name: 'My top tracks',
			description: 'Favorites',
			is_public: false,
		})
	})

	it('rejects ranking mass-assignment fields before touching the database', async () => {
		setupCommonGlobals({
			name: 'Attack',
			user_id: '00000000-0000-4000-8000-000000000099',
			is_public: true,
		})
		const useServerSupabase = vi.fn()
		vi.stubGlobal('useServerSupabase', useServerSupabase)

		const handler = await loadCreateHandler()

		await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
		expect(useServerSupabase).not.toHaveBeenCalled()
	})

	it('checks ownership before updating a ranking', async () => {
		setupCommonGlobals({ name: 'Updated' })
		const forbidden = createNotFoundError('Ranking', 'ranking-id')
		const requireOwnedRanking = vi.fn(async () => {
			throw forbidden
		})
		const query = createSupabaseQueryMock({ data: null, error: null })
		vi.stubGlobal('requireOwnedRanking', requireOwnedRanking)
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn(() => query) }))

		const handler = await loadUpdateHandler()

		await expect(handler({})).rejects.toBe(forbidden)
		expect(requireOwnedRanking).toHaveBeenCalledWith(
			expect.anything(),
			'00000000-0000-4000-8000-000000000010',
			'00000000-0000-4000-8000-000000000001',
		)
		expect(query.update).not.toHaveBeenCalled()
	})

	it('does not expose a private ranking to an unauthenticated caller', async () => {
		setupCommonGlobals()
		vi.stubGlobal('setHeader', vi.fn())
		vi.stubGlobal(
			'getAuthenticatedUser',
			vi.fn(async () => null),
		)
		const query = createSupabaseQueryMock({
			data: {
				id: '00000000-0000-4000-8000-000000000010',
				user_id: '00000000-0000-4000-8000-000000000001',
				is_public: false,
			},
			error: null,
		})
		const fetchRankingWithItems = vi.fn()
		vi.stubGlobal('fetchRankingWithItems', fetchRankingWithItems)
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn(() => query) }))

		const handler = await loadPublicDetailHandler()

		await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
		expect(fetchRankingWithItems).not.toHaveBeenCalled()
	})

	it('validates item ownership before invoking the service-only reorder RPC', async () => {
		const items = [
			{ id: '00000000-0000-4000-8000-000000000020', position: 1 },
			{ id: '00000000-0000-4000-8000-000000000021', position: 2 },
		]
		setupCommonGlobals({ items })
		const requireOwnedRanking = vi.fn(async () => ({ id: 'ranking-id' }))
		const itemQuery = createSupabaseQueryMock({ data: null, error: null, count: 2 })
		const rpc = vi.fn(async () => ({ data: null, error: null }))
		vi.stubGlobal('requireOwnedRanking', requireOwnedRanking)
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => itemQuery),
			rpc,
		}))

		const handler = await loadReorderHandler()

		await expect(handler({})).resolves.toEqual({ success: true })
		expect(itemQuery.eq).toHaveBeenCalledWith(
			'ranking_id',
			'00000000-0000-4000-8000-000000000010',
		)
		expect(itemQuery.in).toHaveBeenCalledWith(
			'id',
			items.map((item) => item.id),
		)
		expect(rpc).toHaveBeenCalledWith('reorder_ranking_items_server', {
			p_ranking_id: '00000000-0000-4000-8000-000000000010',
			p_items: items,
		})
	})
})
