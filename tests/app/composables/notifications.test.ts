import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadNotifications = async () => {
	const module = await import('../../../app/composables/useNotifications')
	return module.useNotifications()
}

const setupGlobals = () => {
	const fetchMock = vi.fn()
	vi.stubGlobal('ref', ref)
	vi.stubGlobal('computed', computed)
	vi.stubGlobal('$fetch', fetchMock)
	vi.stubGlobal('useApiAuthHeaders', () => ({
		requireAuthHeaders: () => ({ Authorization: 'Bearer test-token' }),
	}))
	return fetchMock
}

const notification = (id: string, read: boolean) => ({
	id,
	type: 'new_release',
	title: `Notification ${id}`,
	message: null,
	artist_id: null,
	release_id: null,
	read,
	created_at: '2026-08-30T00:00:00.000Z',
})

describe('useNotifications', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('uses the server unread total instead of only the loaded page', async () => {
		const fetchMock = setupGlobals()
		fetchMock.mockResolvedValueOnce({
			notifications: [notification('one', false)],
			total: 50,
			unread: 17,
			page: 1,
			limit: 30,
		})
		const notifications = await loadNotifications()

		await notifications.fetchNotifications()

		expect(notifications.notifications.value).toHaveLength(1)
		expect(notifications.unreadCount.value).toBe(17)
		expect(notifications.hasMore.value).toBe(true)
	})

	it('rolls back one optimistic read when the API rejects it', async () => {
		const fetchMock = setupGlobals()
		fetchMock
			.mockResolvedValueOnce({
				notifications: [notification('one', false)],
				total: 1,
				unread: 1,
				page: 1,
				limit: 30,
			})
			.mockRejectedValueOnce(new Error('network error'))
		const notifications = await loadNotifications()
		await notifications.fetchNotifications()

		await notifications.markAsRead('one')

		expect(notifications.notifications.value[0]?.read).toBe(false)
		expect(notifications.unreadCount.value).toBe(1)
	})

	it('restores loaded unread items and the global count when read-all fails', async () => {
		const fetchMock = setupGlobals()
		fetchMock
			.mockResolvedValueOnce({
				notifications: [notification('one', false), notification('two', true)],
				total: 8,
				unread: 5,
				page: 1,
				limit: 30,
			})
			.mockRejectedValueOnce(new Error('network error'))
		const notifications = await loadNotifications()
		await notifications.fetchNotifications()

		await notifications.markAllAsRead()

		expect(notifications.notifications.value.map(({ read }) => read)).toEqual([
			false,
			true,
		])
		expect(notifications.unreadCount.value).toBe(5)
	})
})
