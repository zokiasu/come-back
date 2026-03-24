export default defineEventHandler(async (event) => {
	// Vérification du secret cron (appelé par pg_cron ou un scheduler externe)
	const config = useRuntimeConfig()
	const cronSecret = getHeader(event, 'x-cron-secret')

	if (!cronSecret || cronSecret !== config.CRON_SECRET) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
	}

	const supabase = useServerSupabase()
	const today = new Date().toISOString().slice(0, 10)

	// Récupérer les sorties du jour vérifiées
	const { data: releases, error: relError } = await supabase
		.from('releases')
		.select('id, name, image, artist_releases!inner(artists!inner(name))')
		.eq('date', today)
		.eq('verified', true)

	if (relError) throw handleSupabaseError(relError, 'releases.today')
	if (!releases?.length) return { sent: 0, message: "Aucune sortie aujourd'hui" }

	// Récupérer toutes les subscriptions des users avec daily_comeback activé
	const { data: prefs, error: prefsError } = await supabase
		.from('notification_preferences')
		.select('user_id')
		.eq('push_enabled', true)
		.eq('daily_comeback', true)

	if (prefsError) throw handleSupabaseError(prefsError, 'notification_preferences.daily')
	if (!prefs?.length) return { sent: 0, message: 'Aucun abonné au comeback du jour' }

	const userIds = prefs.map((p) => p.user_id)

	const { data: subs, error: subError } = await supabase
		.from('push_subscriptions')
		.select('id, endpoint, p256dh, auth')
		.in('user_id', userIds)

	if (subError) throw handleSupabaseError(subError, 'push_subscriptions.daily')
	if (!subs?.length) return { sent: 0, message: 'Aucune subscription active' }

	// Construire le payload
	type ReleaseRow = {
		id: string
		name: string
		image: string | null
		artist_releases: { artists: { name: string } }[]
	}
	const firstRelease = releases[0] as unknown as ReleaseRow
	const artistName = firstRelease.artist_releases?.[0]?.artists?.name ?? ''
	const count = releases.length

	const payload = {
		title: '🎵 Comeback du jour',
		body:
			count === 1
				? `${artistName} sort aujourd'hui !`
				: `${count} sorties aujourd'hui — dont ${artistName}`,
		icon: firstRelease.image ?? '/icons/icon-192x192.png',
		url: count === 1 ? `/release/${firstRelease.id}` : '/calendar',
		tag: 'daily-comeback',
	}

	// Fan-out + collecte des subscriptions expirées
	const expiredIds: string[] = []
	let sent = 0

	await Promise.allSettled(
		subs.map(async (sub) => {
			const ok = await sendPush(sub, payload)
			if (ok) sent++
			else expiredIds.push(sub.id)
		}),
	)

	// Purger les subscriptions expirées
	if (expiredIds.length) {
		await supabase.from('push_subscriptions').delete().in('id', expiredIds)
	}

	return { sent, expired: expiredIds.length }
})
