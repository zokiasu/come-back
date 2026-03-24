// NOTE: Dates are calculated in UTC via toISOString().
// Releases in the database are stored as local dates (YYYY-MM-DD).
// The cron should be configured to trigger at midnight KST (= 15:00 UTC)
// if the primary audience is Korean.

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
		title: '🎵 Today\'s comebacks',
		body:
			count === 1
				? `${artistName} releases today!`
				: `${count} releases today — including ${artistName}`,
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
		title: '📅 Weekly comebacks recap',
		body:
			count === 1
				? `${firstArtist} releases this week!`
				: `${count} releases this week — ${firstArtist} and more`,
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

export async function notifyFollowersOfNewRelease(
	releaseId: string,
	releaseName: string,
	artistIds: string[],
): Promise<void> {
	const supabase = useServerSupabase()

	// Fetch artist names
	const { data: artists } = await supabase
		.from('artists')
		.select('id, name')
		.in('id', artistIds)

	if (!artists?.length) return

	// Find all followers of these artists
	const { data: follows } = await supabase
		.from('user_followed_artists')
		.select('user_id, artist_id')
		.in('artist_id', artistIds)

	if (!follows?.length) return

	const artistMap = new Map(artists.map((a) => [a.id, a.name]))

	// A user may follow multiple artists on the same release — one notification per user
	const userArtistMap = new Map<string, string>()
	for (const follow of follows) {
		if (!userArtistMap.has(follow.user_id)) {
			userArtistMap.set(follow.user_id, follow.artist_id)
		}
	}

	const rows = [...userArtistMap.entries()].map(([userId, artistId]) => ({
		user_id: userId,
		type: 'new_release' as const,
		title: `${artistMap.get(artistId) ?? 'A followed artist'} has a new release`,
		message: releaseName,
		artist_id: artistId,
		release_id: releaseId,
	}))

	if (rows.length) {
		await supabase.from('user_notifications').insert(rows)
	}
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

	// Fetch today's verified releases with their artists
	const { data: releases, error: relError } = await supabase
		.from('releases')
		.select('id, name, image, artist_releases!inner(artists!inner(id, name))')
		.eq('date', today)
		.eq('verified', true)

	if (relError) throw handleSupabaseError(relError, 'releases.today.followed')
	if (!releases?.length) return { sent: 0, expired: 0 }

	// Collect all artist IDs from today's releases
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

	// Find users following these artists with notifications enabled
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

	// Map each eligible user to their first release of the day (followed artist)
	// A user may follow multiple artists releasing the same day — one notification per user
	const userReleaseMap = new Map<
		string,
		{ release: FollowedReleaseRow; artistName: string; artistId: string }
	>()
	for (const follow of follows) {
		if (!eligibleUserIds.has(follow.user_id)) continue
		if (userReleaseMap.has(follow.user_id)) continue

		const release = artistReleaseMap.get(follow.artist_id)
		if (!release) continue

		const artistName =
			release.artist_releases.find((ar) => ar.artists.id === follow.artist_id)?.artists
				.name ?? ''

		userReleaseMap.set(follow.user_id, { release, artistName, artistId: follow.artist_id })
	}

	if (!userReleaseMap.size) return { sent: 0, expired: 0 }

	// Fetch subscriptions for eligible users
	const { data: subs, error: subError } = await supabase
		.from('push_subscriptions')
		.select('id, endpoint, p256dh, auth, user_id')
		.in('user_id', [...userReleaseMap.keys()])

	if (subError) throw handleSupabaseError(subError, 'push_subscriptions.followed')
	if (!subs?.length) return { sent: 0, expired: 0 }

	// Fan-out with per-user personalized payload
	const expiredIds: string[] = []
	let sent = 0

	await Promise.allSettled(
		subs.map(async (sub) => {
			const userInfo = userReleaseMap.get(sub.user_id)
			if (!userInfo) return

			const { release, artistName } = userInfo
			const payload = {
				title: '🔔 New comeback',
				body: `${artistName} releases today!`,
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
