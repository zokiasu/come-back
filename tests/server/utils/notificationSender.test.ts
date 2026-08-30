import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { createSupabaseQueryMock } from '../../helpers/supabaseQuery'

const loadNotifier = async () => {
	const module = await import('../../../server/utils/notificationSender')
	return module.notifyFollowersOfNewRelease
}

const loadNotificationModule = async () =>
	await import('../../../server/utils/notificationSender')

describe('notifyFollowersOfNewRelease', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
		vi.stubGlobal('createError', createError)
		vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	})

	it('surfaces notification insert failures instead of reporting a silent success', async () => {
		const artists = createSupabaseQueryMock({
			data: [{ id: 'artist-id', name: 'aespa' }],
			error: null,
		})
		const follows = createSupabaseQueryMock({
			data: [{ user_id: 'user-id', artist_id: 'artist-id' }],
			error: null,
		})
		const notifications = createSupabaseQueryMock({
			data: null,
			error: { code: '42501', message: 'insert denied', details: '', hint: '' },
		})
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn((table: string) => {
				if (table === 'artists') return artists
				if (table === 'user_followed_artists') return follows
				if (table === 'user_notifications') return notifications
				throw new Error(`Unexpected table: ${table}`)
			}),
		}))

		const notify = await loadNotifier()

		await expect(notify('release-id', 'Armageddon', ['artist-id'])).rejects.toMatchObject(
			{
				statusCode: 500,
				data: { context: 'user_notifications.insert' },
			},
		)
		expect(notifications.insert).toHaveBeenCalledOnce()
	})

	it('reports sent, expired and transiently failed push deliveries separately', async () => {
		const releases = createSupabaseQueryMock({
			data: [
				{
					id: 'release-id',
					name: 'Armageddon',
					image: null,
					artist_releases: [{ artists: { name: 'aespa' } }],
				},
			],
			error: null,
		})
		const preferences = createSupabaseQueryMock({
			data: [{ user_id: 'user-id' }],
			error: null,
		})
		const subscriptions = createSupabaseQueryMock({
			data: [
				{ id: 'sent', endpoint: 'sent', p256dh: 'key', auth: 'auth' },
				{ id: 'expired', endpoint: 'expired', p256dh: 'key', auth: 'auth' },
				{ id: 'failed', endpoint: 'failed', p256dh: 'key', auth: 'auth' },
			],
			error: null,
		})
		const cleanup = createSupabaseQueryMock({ error: null })
		let pushSubscriptionCalls = 0

		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn((table: string) => {
				if (table === 'releases') return releases
				if (table === 'notification_preferences') return preferences
				if (table === 'push_subscriptions') {
					pushSubscriptionCalls += 1
					return pushSubscriptionCalls === 1 ? subscriptions : cleanup
				}
				throw new Error(`Unexpected table: ${table}`)
			}),
		}))
		vi.stubGlobal(
			'sendPush',
			vi.fn(async (subscription: { id?: string; endpoint: string }) => {
				if (subscription.endpoint === 'sent') return true
				if (subscription.endpoint === 'expired') return false
				throw new Error('temporary gateway error')
			}),
		)

		const { sendDailyNotifications } = await loadNotificationModule()

		await expect(sendDailyNotifications()).resolves.toEqual({
			sent: 1,
			expired: 1,
			failed: 1,
		})
		expect(cleanup.calls).toEqual([
			{ method: 'delete', args: [] },
			{ method: 'in', args: ['id', ['expired']] },
		])
	})
})
