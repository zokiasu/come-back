export interface AppNotification {
	id: string
	type: 'new_release' | 'followed_artist'
	title: string
	message: string | null
	artist_id: string | null
	release_id: string | null
	read: boolean
	created_at: string
}

interface NotificationsResponse {
	notifications: AppNotification[]
	total: number
	page: number
	limit: number
}

export function useNotifications() {
	const { requireAuthHeaders } = useApiAuthHeaders()

	const notifications = ref<AppNotification[]>([])
	const isLoading = ref(false)
	const total = ref(0)
	const currentPage = ref(1)
	const limit = 30

	const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)
	const hasMore = computed(() => notifications.value.length < total.value)

	const fetchNotifications = async (page = 1) => {
		isLoading.value = true
		try {
			const res = await $fetch<NotificationsResponse>('/api/notifications', {
				headers: requireAuthHeaders(),
				query: { page, limit },
			})
			if (page === 1) {
				notifications.value = res.notifications
			} else {
				notifications.value.push(...res.notifications)
			}
			total.value = res.total
			currentPage.value = page
		} finally {
			isLoading.value = false
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
		await $fetch(`/api/notifications/${id}/read`, {
			method: 'PATCH',
			headers: requireAuthHeaders(),
		}).catch(() => {
			notification.read = false
		})
	}

	const markAllAsRead = async () => {
		const hadUnread = notifications.value.some((n) => !n.read)
		if (!hadUnread) return

		notifications.value.forEach((n) => (n.read = true))
		await $fetch('/api/notifications/read-all', {
			method: 'POST',
			headers: requireAuthHeaders(),
		}).catch(() => {
			fetchNotifications()
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
