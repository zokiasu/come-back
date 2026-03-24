export default defineEventHandler(async (event) => {
	// Vérification du secret cron
	const config = useRuntimeConfig()
	const cronSecret = getHeader(event, 'x-cron-secret')

	if (!cronSecret || cronSecret !== config.CRON_SECRET) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
	}

	const supabase = useServerSupabase()
	const today = new Date()
	const nextWeek = new Date(today)
	nextWeek.setDate(today.getDate() + 7)

	const startDate = today.toISOString().slice(0, 10)
	const endDate = nextWeek.toISOString().slice(0, 10)

	// Récupérer les sorties de la semaine vérifiées
	const { data: releases, error: relError } = await supabase
		.from('releases')
		.select('id, name, date, image, artist_releases!inner(artists!inner(name))')
		.gte('date', startDate)
		.lte('date', endDate)
		.eq('verified', true)
		.order('date', { ascending: true })
		.limit(10)

	if (relError) throw handleSupabaseError(relError, 'releases.weekly')
	if (!releases?.length) return { sent: 0, message: 'Aucune sortie cette semaine' }

	// Récupérer les subscriptions des users avec weekly_comeback activé
	const { data: prefs, error: prefsError } = await supabase
		.from('notification_preferences')
		.select('user_id')
		.eq('push_enabled', true)
		.eq('weekly_comeback', true)

	if (prefsError) throw handleSupabaseError(prefsError, 'notification_preferences.weekly')
	if (!prefs?.length) return { sent: 0, message: 'Aucun abonné au récap hebdo' }

	const userIds = prefs.map((p) => p.user_id)

	const { data: subs, error: subError } = await supabase
		.from('push_subscriptions')
		.select('id, endpoint, p256dh, auth')
		.in('user_id', userIds)

	if (subError) throw handleSupabaseError(subError, 'push_subscriptions.weekly')
	if (!subs?.length) return { sent: 0, message: 'Aucune subscription active' }

	// Construire le payload
	type ReleaseRow = {
		id: string
		name: string
		date: string | null
		image: string | null
		artist_releases: { artists: { name: string } }[]
	}
	const count = releases.length
	const firstArtist =
		(releases[0] as unknown as ReleaseRow).artist_releases?.[0]?.artists?.name ?? ''

	const payload = {
		title: '📅 Récap comebacks de la semaine',
		body:
			count === 1
				? `${firstArtist} sort cette semaine !`
				: `${count} sorties cette semaine — ${firstArtist} et plus`,
		icon: (releases[0] as unknown as ReleaseRow).image ?? '/icons/icon-192x192.png',
		url: '/calendar',
		tag: 'weekly-comeback',
	}

	// Fan-out
	const expiredIds: string[] = []
	let sent = 0

	await Promise.allSettled(
		subs.map(async (sub) => {
			const ok = await sendPush(sub, payload)
			if (ok) sent++
			else expiredIds.push(sub.id)
		}),
	)

	if (expiredIds.length) {
		await supabase.from('push_subscriptions').delete().in('id', expiredIds)
	}

	return { sent, expired: expiredIds.length }
})
