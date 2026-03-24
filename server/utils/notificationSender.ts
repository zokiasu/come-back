// NOTE: Les dates sont calculées en UTC via toISOString().
// Les releases en base sont stockées en date locale (YYYY-MM-DD).
// Le cron doit être configuré pour se déclencher à minuit KST (= 15:00 UTC)
// si l'audience principale est coréenne.

type ReleaseRow = {
	id: string
	name: string
	date?: string | null
	image: string | null
	artist_releases: { artists: { name: string } }[]
}

type SubscriptionRow = {
	id: string
	endpoint: string
	p256dh: string
	auth: string
}

async function fanOutAndClean(
	subs: SubscriptionRow[],
	payload: Parameters<typeof sendPush>[1],
): Promise<{ sent: number; expiredIds: string[] }> {
	const expiredIds: string[] = []
	let sent = 0

	await Promise.allSettled(
		subs.map(async (sub) => {
			const ok = await sendPush(sub, payload)
			if (ok) sent++
			else expiredIds.push(sub.id)
		}),
	)

	return { sent, expiredIds }
}

export async function sendDailyNotifications(): Promise<{
	sent: number
	expired: number
}> {
	const supabase = useServerSupabase()
	const today = new Date().toISOString().slice(0, 10)

	const { data: releases, error: relError } = await supabase
		.from('releases')
		.select('id, name, image, artist_releases!inner(artists!inner(name))')
		.eq('date', today)
		.eq('verified', true)

	if (relError) throw handleSupabaseError(relError, 'releases.today')
	if (!releases?.length) return { sent: 0, expired: 0 }

	const { data: prefs, error: prefsError } = await supabase
		.from('notification_preferences')
		.select('user_id')
		.eq('push_enabled', true)
		.eq('daily_comeback', true)

	if (prefsError) throw handleSupabaseError(prefsError, 'notification_preferences.daily')
	if (!prefs?.length) return { sent: 0, expired: 0 }

	const userIds = prefs.map((p) => p.user_id)

	const { data: subs, error: subError } = await supabase
		.from('push_subscriptions')
		.select('id, endpoint, p256dh, auth')
		.in('user_id', userIds)

	if (subError) throw handleSupabaseError(subError, 'push_subscriptions.daily')
	if (!subs?.length) return { sent: 0, expired: 0 }

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

	const { sent, expiredIds } = await fanOutAndClean(subs, payload)

	if (expiredIds.length) {
		await supabase.from('push_subscriptions').delete().in('id', expiredIds)
	}

	return { sent, expired: expiredIds.length }
}

export async function sendWeeklyNotifications(): Promise<{
	sent: number
	expired: number
}> {
	const supabase = useServerSupabase()
	const today = new Date()
	const nextWeek = new Date(today)
	nextWeek.setDate(today.getDate() + 7)

	const startDate = today.toISOString().slice(0, 10)
	const endDate = nextWeek.toISOString().slice(0, 10)

	const { data: releases, error: relError } = await supabase
		.from('releases')
		.select('id, name, date, image, artist_releases!inner(artists!inner(name))')
		.gte('date', startDate)
		.lt('date', endDate)
		.eq('verified', true)
		.order('date', { ascending: true })
		.limit(10)

	if (relError) throw handleSupabaseError(relError, 'releases.weekly')
	if (!releases?.length) return { sent: 0, expired: 0 }

	const { data: prefs, error: prefsError } = await supabase
		.from('notification_preferences')
		.select('user_id')
		.eq('push_enabled', true)
		.eq('weekly_comeback', true)

	if (prefsError) throw handleSupabaseError(prefsError, 'notification_preferences.weekly')
	if (!prefs?.length) return { sent: 0, expired: 0 }

	const userIds = prefs.map((p) => p.user_id)

	const { data: subs, error: subError } = await supabase
		.from('push_subscriptions')
		.select('id, endpoint, p256dh, auth')
		.in('user_id', userIds)

	if (subError) throw handleSupabaseError(subError, 'push_subscriptions.weekly')
	if (!subs?.length) return { sent: 0, expired: 0 }

	const count = releases.length
	const firstRelease = releases[0] as unknown as ReleaseRow
	const firstArtist = firstRelease.artist_releases?.[0]?.artists?.name ?? ''

	const payload = {
		title: '📅 Récap comebacks de la semaine',
		body:
			count === 1
				? `${firstArtist} sort cette semaine !`
				: `${count} sorties cette semaine — ${firstArtist} et plus`,
		icon: firstRelease.image ?? '/icons/icon-192x192.png',
		url: '/calendar',
		tag: 'weekly-comeback',
	}

	const { sent, expiredIds } = await fanOutAndClean(subs, payload)

	if (expiredIds.length) {
		await supabase.from('push_subscriptions').delete().in('id', expiredIds)
	}

	return { sent, expired: expiredIds.length }
}

type FollowedReleaseRow = {
	id: string
	name: string
	image: string | null
	artist_releases: { artists: { id: string; name: string } }[]
}

export async function sendFollowedArtistNotifications(): Promise<{
	sent: number
	expired: number
}> {
	const supabase = useServerSupabase()
	const today = new Date().toISOString().slice(0, 10)

	// Récupérer les sorties vérifiées du jour avec leurs artistes
	const { data: releases, error: relError } = await supabase
		.from('releases')
		.select('id, name, image, artist_releases!inner(artists!inner(id, name))')
		.eq('date', today)
		.eq('verified', true)

	if (relError) throw handleSupabaseError(relError, 'releases.today.followed')
	if (!releases?.length) return { sent: 0, expired: 0 }

	// Collecter tous les artist IDs des sorties du jour
	const artistReleaseMap = new Map<string, FollowedReleaseRow>()
	for (const rel of releases as unknown as FollowedReleaseRow[]) {
		for (const ar of rel.artist_releases) {
			if (!artistReleaseMap.has(ar.artists.id)) {
				artistReleaseMap.set(ar.artists.id, rel)
			}
		}
	}

	if (!artistReleaseMap.size) return { sent: 0, expired: 0 }

	const artistIds = [...artistReleaseMap.keys()]

	// Trouver les users qui suivent ces artistes et ont les notifications activées
	const { data: follows, error: followsError } = await supabase
		.from('user_followed_artists')
		.select('user_id, artist_id')
		.in('artist_id', artistIds)

	if (followsError)
		throw handleSupabaseError(followsError, 'user_followed_artists.select')
	if (!follows?.length) return { sent: 0, expired: 0 }

	const followerIds = [...new Set(follows.map((f) => f.user_id))]

	const { data: prefs, error: prefsError } = await supabase
		.from('notification_preferences')
		.select('user_id')
		.in('user_id', followerIds)
		.eq('push_enabled', true)
		.eq('followed_artist_alerts', true)

	if (prefsError)
		throw handleSupabaseError(prefsError, 'notification_preferences.followed')
	if (!prefs?.length) return { sent: 0, expired: 0 }

	const eligibleUserIds = new Set(prefs.map((p) => p.user_id))

	// Associer chaque user éligible à sa première sortie du jour (artiste suivi)
	// Un user peut suivre plusieurs artistes sortant le même jour — une seule notif par user
	const userReleaseMap = new Map<
		string,
		{ release: FollowedReleaseRow; artistName: string }
	>()
	for (const follow of follows) {
		if (!eligibleUserIds.has(follow.user_id)) continue
		if (userReleaseMap.has(follow.user_id)) continue

		const release = artistReleaseMap.get(follow.artist_id)
		if (!release) continue

		const artistName =
			release.artist_releases.find((ar) => ar.artists.id === follow.artist_id)?.artists
				.name ?? ''

		userReleaseMap.set(follow.user_id, { release, artistName })
	}

	if (!userReleaseMap.size) return { sent: 0, expired: 0 }

	// Récupérer les subscriptions des users éligibles
	const { data: subs, error: subError } = await supabase
		.from('push_subscriptions')
		.select('id, endpoint, p256dh, auth, user_id')
		.in('user_id', [...userReleaseMap.keys()])

	if (subError) throw handleSupabaseError(subError, 'push_subscriptions.followed')
	if (!subs?.length) return { sent: 0, expired: 0 }

	// Fan-out avec payload personnalisé par user
	const expiredIds: string[] = []
	let sent = 0

	await Promise.allSettled(
		subs.map(async (sub) => {
			const userInfo = userReleaseMap.get(sub.user_id)
			if (!userInfo) return

			const { release, artistName } = userInfo
			const payload = {
				title: '🔔 Nouveau comeback',
				body: `${artistName} sort aujourd'hui !`,
				icon: release.image ?? '/icons/icon-192x192.png',
				url: `/release/${release.id}`,
				tag: `followed-artist-${sub.user_id}`,
			}

			const ok = await sendPush(sub, payload)
			if (ok) sent++
			else expiredIds.push(sub.id)
		}),
	)

	if (expiredIds.length) {
		await supabase.from('push_subscriptions').delete().in('id', expiredIds)
	}

	return { sent, expired: expiredIds.length }
}
