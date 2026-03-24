import webpush from 'web-push'
import type { PushPayload } from '~/types'

interface PushSubscription {
	endpoint: string
	p256dh: string
	auth: string
}

let vapidConfigured = false

const getWebPush = () => {
	if (!vapidConfigured) {
		const config = useRuntimeConfig()
		webpush.setVapidDetails(
			config.VAPID_SUBJECT as string,
			config.public.VAPID_PUBLIC_KEY as string,
			config.VAPID_PRIVATE_KEY as string,
		)
		vapidConfigured = true
	}
	return webpush
}

/**
 * Sends a push notification to a single subscription.
 * Returns false if the subscription is expired/invalid (410/404) — caller should delete it.
 */
export const sendPush = async (
	subscription: PushSubscription,
	payload: PushPayload,
): Promise<boolean> => {
	const wp = getWebPush()
	try {
		await wp.sendNotification(
			{
				endpoint: subscription.endpoint,
				keys: { p256dh: subscription.p256dh, auth: subscription.auth },
			},
			JSON.stringify(payload),
		)
		return true
	} catch (err: unknown) {
		const status = (err as { statusCode?: number }).statusCode
		if (status === 410 || status === 404) return false
		// Rethrow transient errors — caller must NOT delete the subscription
		throw err
	}
}

export type { PushPayload, PushSubscription }
