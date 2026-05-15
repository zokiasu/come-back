import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import { handleSupabaseError } from '#server/utils/errorHandler'

const setupCommonGlobals = () => {
	vi.stubGlobal(
		'requireAuth',
		vi.fn(async () => ({ id: 'user-id' })),
	)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal(
		'validateRouteParam',
		vi.fn(() => 'notification-id'),
	)
}

const loadListHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/notifications/index.get'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const loadReadAllHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/notifications/read-all.post'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const loadReadOneHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/notifications/[id]/read.patch'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

describe('notification list/read API', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('should list authenticated user notifications with fixed pagination', async () => {
		setupCommonGlobals()
		vi.stubGlobal(
			'getQuery',
			vi.fn(() => ({ page: '2' })),
		)

		const notifications = [
			{
				id: 'notification-id',
				type: 'release',
				title: 'New comeback',
				read: false,
			},
		]
		const notificationsQuery = createSupabaseQueryMock({
			data: notifications,
			count: 31,
			error: null,
		})
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => notificationsQuery),
		}))

		const handler = await loadListHandler()
		const result = await handler({})

		expect(notificationsQuery.calls).toEqual([
			{
				method: 'select',
				args: [
					'id, type, title, message, artist_id, release_id, read, created_at',
					{ count: 'exact' },
				],
			},
			{ method: 'eq', args: ['user_id', 'user-id'] },
			{ method: 'order', args: ['created_at', { ascending: false }] },
			{ method: 'range', args: [30, 59] },
		])
		expect(result).toEqual({
			notifications,
			total: 31,
			page: 2,
			limit: 30,
		})
	})

	it('should clamp invalid notification pages to page 1', async () => {
		setupCommonGlobals()
		vi.stubGlobal(
			'getQuery',
			vi.fn(() => ({ page: '-5' })),
		)

		const notificationsQuery = createSupabaseQueryMock({
			data: [],
			count: 0,
			error: null,
		})
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => notificationsQuery),
		}))

		const handler = await loadListHandler()

		await expect(handler({})).resolves.toMatchObject({
			page: 1,
			limit: 30,
		})
		expect(notificationsQuery.calls).toContainEqual({
			method: 'range',
			args: [0, 29],
		})
	})

	it('should mark every unread notification as read for the authenticated user', async () => {
		setupCommonGlobals()

		const updateQuery = createSupabaseQueryMock({ error: null })
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => updateQuery),
		}))

		const handler = await loadReadAllHandler()

		await expect(handler({})).resolves.toEqual({ success: true })
		expect(updateQuery.calls).toEqual([
			{ method: 'update', args: [{ read: true }] },
			{ method: 'eq', args: ['user_id', 'user-id'] },
			{ method: 'eq', args: ['read', false] },
		])
	})

	it('should mark one notification as read only for the authenticated user', async () => {
		setupCommonGlobals()
		vi.stubGlobal(
			'getRouterParam',
			vi.fn(() => 'notification-id'),
		)

		const updateQuery = createSupabaseQueryMock({ error: null })
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => updateQuery),
		}))

		const handler = await loadReadOneHandler()

		await expect(handler({})).resolves.toEqual({ success: true })
		expect(updateQuery.calls).toEqual([
			{ method: 'update', args: [{ read: true }] },
			{ method: 'eq', args: ['id', 'notification-id'] },
			{ method: 'eq', args: ['user_id', 'user-id'] },
		])
	})
})
