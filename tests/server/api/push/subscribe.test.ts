import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import { createBadRequestError, handleSupabaseError } from '#server/utils/errorHandler'

const loadPostHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/push/subscribe.post'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const loadDeleteHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/push/subscribe.delete'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (body: unknown) => {
	vi.stubGlobal(
		'requireAuth',
		vi.fn(async () => ({ id: 'user-id' })),
	)
	vi.stubGlobal(
		'readBody',
		vi.fn(async () => body),
	)
	vi.stubGlobal('createBadRequestError', createBadRequestError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
}

describe('push subscription API', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-05-15T10:30:00Z'))
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should reject incomplete subscription payloads', async () => {
		setupGlobals({ endpoint: 'https://push.example.com' })
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn() }))

		const handler = await loadPostHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
		})
	})

	it('should upsert a subscription and enable push preferences', async () => {
		const body = {
			endpoint: 'https://push.example.com',
			p256dh: 'p256dh-key',
			auth: 'auth-secret',
			userAgent: 'Test Browser',
		}
		setupGlobals(body)

		const subscriptionQuery = createSupabaseQueryMock({ error: null })
		const preferencesQuery = createSupabaseQueryMock({ error: null })
		const queriesByTable: Record<string, unknown[]> = {
			push_subscriptions: [subscriptionQuery],
			notification_preferences: [preferencesQuery],
		}
		const supabase = {
			from: vi.fn((table: string) => {
				const query = queriesByTable[table]?.shift()

				if (!query) throw new Error(`Unexpected table: ${table}`)

				return query
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadPostHandler()

		await expect(handler({})).resolves.toEqual({ success: true })
		expect(subscriptionQuery.calls).toEqual([
			{
				method: 'upsert',
				args: [
					{
						user_id: 'user-id',
						endpoint: 'https://push.example.com',
						p256dh: 'p256dh-key',
						auth: 'auth-secret',
						user_agent: 'Test Browser',
					},
					{ onConflict: 'endpoint' },
				],
			},
		])
		expect(preferencesQuery.calls).toEqual([
			{
				method: 'upsert',
				args: [{ user_id: 'user-id', push_enabled: true }, { onConflict: 'user_id' }],
			},
		])
	})

	it('should reject unsubscribe requests without endpoint', async () => {
		setupGlobals({})
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn() }))

		const handler = await loadDeleteHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
		})
	})

	it('should disable push preferences when the last subscription is removed', async () => {
		setupGlobals({ endpoint: 'https://push.example.com' })

		const deleteSubscriptionQuery = createSupabaseQueryMock({ error: null })
		const countSubscriptionsQuery = createSupabaseQueryMock({
			count: 0,
			error: null,
		})
		const updatePreferencesQuery = createSupabaseQueryMock({ error: null })
		const queriesByTable: Record<string, unknown[]> = {
			push_subscriptions: [deleteSubscriptionQuery, countSubscriptionsQuery],
			notification_preferences: [updatePreferencesQuery],
		}
		const supabase = {
			from: vi.fn((table: string) => {
				const query = queriesByTable[table]?.shift()

				if (!query) throw new Error(`Unexpected table: ${table}`)

				return query
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadDeleteHandler()

		await expect(handler({})).resolves.toEqual({ success: true })
		expect(deleteSubscriptionQuery.calls).toEqual([
			{ method: 'delete', args: [] },
			{ method: 'eq', args: ['user_id', 'user-id'] },
			{ method: 'eq', args: ['endpoint', 'https://push.example.com'] },
		])
		expect(countSubscriptionsQuery.calls).toEqual([
			{ method: 'select', args: ['id', { count: 'exact', head: true }] },
			{ method: 'eq', args: ['user_id', 'user-id'] },
		])
		expect(updatePreferencesQuery.calls).toEqual([
			{
				method: 'update',
				args: [
					{
						push_enabled: false,
						updated_at: '2026-05-15T10:30:00.000Z',
					},
				],
			},
			{ method: 'eq', args: ['user_id', 'user-id'] },
		])
	})

	it('should keep push preferences enabled when other subscriptions remain', async () => {
		setupGlobals({ endpoint: 'https://push.example.com' })

		const deleteSubscriptionQuery = createSupabaseQueryMock({ error: null })
		const countSubscriptionsQuery = createSupabaseQueryMock({
			count: 2,
			error: null,
		})
		const supabase = {
			from: vi
				.fn()
				.mockReturnValueOnce(deleteSubscriptionQuery)
				.mockReturnValueOnce(countSubscriptionsQuery),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadDeleteHandler()

		await expect(handler({})).resolves.toEqual({ success: true })
		expect(supabase.from).toHaveBeenCalledTimes(2)
	})
})
