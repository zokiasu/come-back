import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { createSupabaseQueryMock } from '../../helpers/supabaseQuery'

const loadNotifier = async () => {
	const module = await import('../../../server/utils/notificationSender')
	return module.notifyFollowersOfNewRelease
}

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
})
