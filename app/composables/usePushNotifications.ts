export function usePushNotifications() {
	const config = useRuntimeConfig()
	const { requireAuthHeaders } = useApiAuthHeaders()
	const { runMutation } = useMutationTimeout()

	const isSupported = computed(
		() =>
			import.meta.client &&
			'serviceWorker' in navigator &&
			'PushManager' in window &&
			'Notification' in window,
	)

	const permission = ref<NotificationPermission>('default')
	const isSubscribed = ref(false)
	const currentEndpoint = ref<string | null>(null)

	const updatePermissionState = () => {
		if (!import.meta.client || !('Notification' in window)) return
		permission.value = Notification.permission
	}

	const getCurrentSubscription = async (): Promise<PushSubscription | null> => {
		if (!isSupported.value) return null
		const reg = await navigator.serviceWorker.ready
		return reg.pushManager.getSubscription()
	}

	const subscribe = async (): Promise<boolean> => {
		if (!isSupported.value) return false

		const result = await Notification.requestPermission()
		permission.value = result
		if (result !== 'granted') return false

		const vapidPublicKey = config.public.VAPID_PUBLIC_KEY as string
		if (!vapidPublicKey) {
			console.error('[push] VAPID_PUBLIC_KEY manquant')
			return false
		}

		const reg = await navigator.serviceWorker.ready
		const sub = await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: vapidPublicKey,
		})

		const json = sub.toJSON()
		const keys = json.keys as { p256dh: string; auth: string }

		await runMutation(
			$fetch<{ success: boolean }>('/api/push/subscribe', {
				method: 'POST',
				headers: requireAuthHeaders() as Record<string, string>,
				body: {
					endpoint: sub.endpoint,
					p256dh: keys.p256dh,
					auth: keys.auth,
					userAgent: navigator.userAgent,
				},
			}),
			"L'abonnement aux notifications a expiré.",
		)

		isSubscribed.value = true
		currentEndpoint.value = sub.endpoint
		return true
	}

	const unsubscribe = async (): Promise<void> => {
		const sub = await getCurrentSubscription()
		if (!sub) return

		await runMutation(
			$fetch<{ success: boolean }>('/api/push/subscribe', {
				method: 'DELETE',
				headers: requireAuthHeaders() as Record<string, string>,
				body: { endpoint: sub.endpoint },
			}),
			'La désinscription aux notifications a expiré.',
		)

		await sub.unsubscribe()
		isSubscribed.value = false
		currentEndpoint.value = null
	}

	onMounted(async () => {
		if (!isSupported.value) return
		updatePermissionState()
		const sub = await getCurrentSubscription()
		isSubscribed.value = Boolean(sub)
		currentEndpoint.value = sub?.endpoint ?? null
	})

	return {
		isSupported,
		permission,
		isSubscribed,
		currentEndpoint,
		subscribe,
		unsubscribe,
	}
}
