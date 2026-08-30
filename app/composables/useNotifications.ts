import { computed, ref } from 'vue'
import type { AppNotification, NotificationsResponse } from '~/types/api'

export function useNotifications() {
	const { requireAuthHeaders } = useApiAuthHeaders()

	const notifications = ref<AppNotification[]>([])
	const isLoading = ref(false)
	const total = ref(0)
	const unreadCount = ref(0)
	const currentPage = ref(1)
	const limit = 30
	let latestRequestId = 0

	const hasMore = computed(() => notifications.value.length < total.value)

	const fetchNotifications = async (page = 1) => {
		const requestId = ++latestRequestId
		isLoading.value = true
		try {
			const res = await $fetch<NotificationsResponse>('/api/notifications', {
				headers: requireAuthHeaders(),
				query: { page, limit },
			})
			if (requestId !== latestRequestId) return

			if (page === 1) {
				notifications.value = res.notifications
			} else {
				notifications.value = Array.from(
					new Map(
						[...notifications.value, ...res.notifications].map((notification) => [
							notification.id,
							notification,
						]),
					).values(),
				)
			}
			total.value = res.total
			unreadCount.value = res.unread
			currentPage.value = page
		} finally {
			if (requestId === latestRequestId) isLoading.value = false
		}
	}

	const loadMore = async () => {
		if (!hasMore.value || isLoading.value) return
		await fetchNotifications(currentPage.value + 1)
	}

	const markAsRead = async (id: string) => {
		const notification = notifications.value.find((n) => n.id === id)
		if (!notification || notification.read) return

		notification.read = true
		unreadCount.value = Math.max(0, unreadCount.value - 1)
		await $fetch(`/api/notifications/${id}/read`, {
			method: 'PATCH',
			headers: requireAuthHeaders(),
		}).catch(() => {
			notification.read = false
			unreadCount.value += 1
		})
	}

	const markAllAsRead = async () => {
		if (unreadCount.value === 0) return

		const unreadIds = new Set(
			notifications.value
				.filter((notification) => !notification.read)
				.map(({ id }) => id),
		)
		const previousUnreadCount = unreadCount.value
		notifications.value.forEach((n) => (n.read = true))
		unreadCount.value = 0
		await $fetch('/api/notifications/read-all', {
			method: 'POST',
			headers: requireAuthHeaders(),
		}).catch(() => {
			notifications.value.forEach((notification) => {
				if (unreadIds.has(notification.id)) notification.read = false
			})
			unreadCount.value = previousUnreadCount
		})
	}

	return {
		notifications,
		unreadCount,
		isLoading,
		total,
		hasMore,
		fetchNotifications,
		loadMore,
		markAsRead,
		markAllAsRead,
	}
}
