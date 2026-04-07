<script setup lang="ts">
	const { isSupported, permission, isSubscribed, subscribe, unsubscribe } =
		usePushNotifications()
	const {
		preferences,
		isLoading: prefsLoading,
		fetchPreferences,
		updatePreferences,
	} = useNotificationPreferences()
	const {
		followedArtists,
		isLoading: followsLoading,
		fetchFollowedArtists,
		unfollowArtist,
	} = useFollowedArtists()
	const toast = useToast()

	const isTogglingPush = ref(false)
	const isSaving = ref(false)
	const isUnfollowing = ref<string | null>(null)

	const handleTogglePush = async () => {
		isTogglingPush.value = true
		try {
			if (isSubscribed.value) {
				await unsubscribe()
				await updatePreferences({ push_enabled: false })
				toast.add({
					title: 'Notifications disabled',
					description: 'You will no longer receive push alerts.',
					color: 'neutral',
				})
			} else {
				const ok = await subscribe()
				if (!ok) {
					if (permission.value === 'denied') {
						toast.add({
							title: 'Permission denied',
							description:
								'Re-enable notifications for this site in your browser settings.',
							color: 'error',
						})
					}
					return
				}
				await fetchPreferences()
				toast.add({
					title: 'Notifications enabled',
					description: 'You will receive comeback alerts.',
					color: 'success',
				})
			}
		} catch (err) {
			toast.add({
				title: 'Error',
				description: err instanceof Error ? err.message : 'An error occurred.',
				color: 'error',
			})
		} finally {
			isTogglingPush.value = false
		}
	}

	const handlePreferenceChange = async (
		key: 'daily_comeback' | 'weekly_comeback' | 'followed_artist_alerts',
		value: boolean,
	) => {
		isSaving.value = true
		try {
			await updatePreferences({ [key]: value })
		} catch {
			toast.add({
				title: 'Error',
				description: 'Could not save preference.',
				color: 'error',
			})
		} finally {
			isSaving.value = false
		}
	}

	const handleUnfollow = async (artistId: string, artistName: string) => {
		isUnfollowing.value = artistId
		try {
			await unfollowArtist(artistId)
			toast.add({
				title: 'Artist removed',
				description: `You are no longer following ${artistName}.`,
				color: 'neutral',
			})
		} catch {
			toast.add({
				title: 'Error',
				description: 'Could not remove this artist.',
				color: 'error',
			})
		} finally {
			isUnfollowing.value = null
		}
	}

	onMounted(async () => {
		await Promise.all([fetchPreferences(), fetchFollowedArtists()])
	})
</script>

<template>
	<div class="mx-auto max-w-5xl space-y-6 px-1 pb-6 sm:px-0">
		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="space-y-2">
				<div
					class="bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30 inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase ring-1"
				>
					Notifications
				</div>
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-1">
						<h1 class="text-2xl font-semibold text-white sm:text-3xl">
							Alerts & subscriptions
						</h1>
						<p class="max-w-2xl text-sm leading-6 text-zinc-400">
							Choose the alerts you want to receive. Notifications are sent directly to
							this device via your browser.
						</p>
					</div>
					<NuxtLink
						to="/notifications"
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 hover:bg-cb-quinary-900 flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium text-zinc-400 transition hover:text-white"
					>
						<UIcon name="i-lucide-history" class="size-3.5" />
						History
					</NuxtLink>
				</div>
			</div>
		</section>

		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="space-y-5">
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-1">
						<h2 class="text-base font-semibold text-white">Push notifications</h2>
						<p class="text-sm text-zinc-400">
							Receive alerts even when the app is in the background.
						</p>
					</div>

					<div
						v-if="!isSupported"
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-xl border px-3 py-2 text-xs text-zinc-400"
					>
						Not supported
					</div>

					<USwitch
						v-else
						:model-value="isSubscribed"
						:loading="isTogglingPush"
						:disabled="isTogglingPush"
						color="primary"
						@update:model-value="handleTogglePush"
					/>
				</div>

				<div
					v-if="!isSupported"
					class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
				>
					<div class="flex items-start gap-3">
						<UIcon
							name="i-lucide-smartphone"
							class="mt-0.5 size-4 shrink-0 text-zinc-500"
						/>
						<p class="text-sm text-zinc-400">
							Your browser or device does not support web push notifications. On iOS,
							install the app from Safari then add it to your home screen.
						</p>
					</div>
				</div>

				<div
					v-else-if="isSupported && permission === 'denied'"
					class="bg-cb-primary-900/10 border-cb-primary-900/30 rounded-2xl border p-4"
				>
					<div class="flex items-start gap-3">
						<UIcon
							name="i-lucide-bell-off"
							class="text-cb-primary-400 mt-0.5 size-4 shrink-0"
						/>
						<div class="space-y-1">
							<p class="text-sm font-medium text-white">Permission denied</p>
							<p class="text-sm text-zinc-400">
								To re-enable notifications, go to your browser settings → Privacy →
								Notifications → Permissions for this site.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section
			v-if="isSubscribed"
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="space-y-5">
				<div class="space-y-1">
					<h2 class="text-base font-semibold text-white">My alerts</h2>
					<p class="text-sm text-zinc-400">
						Choose the types of notifications you want to receive.
					</p>
				</div>

				<div v-if="prefsLoading" class="space-y-3">
					<div
						v-for="n in 3"
						:key="n"
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 h-[72px] animate-pulse rounded-2xl border"
					/>
				</div>

				<div v-else-if="preferences" class="space-y-3">
					<div
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between gap-4 rounded-2xl border p-4"
					>
						<div class="flex items-center gap-3">
							<div
								class="bg-cb-primary-900/20 ring-cb-primary-900/30 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1"
							>
								<UIcon
									name="i-lucide-calendar-check"
									class="text-cb-primary-400 size-4"
								/>
							</div>
							<div class="space-y-0.5">
								<p class="text-sm font-medium text-white">Daily comeback</p>
								<p class="text-xs text-zinc-500">
									A notification each morning for today's releases.
								</p>
							</div>
						</div>
						<USwitch
							:model-value="preferences.daily_comeback"
							:disabled="isSaving"
							color="primary"
							@update:model-value="
								(v: boolean) => handlePreferenceChange('daily_comeback', v)
							"
						/>
					</div>

					<div
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between gap-4 rounded-2xl border p-4"
					>
						<div class="flex items-center gap-3">
							<div
								class="bg-cb-primary-900/20 ring-cb-primary-900/30 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1"
							>
								<UIcon
									name="i-lucide-calendar-range"
									class="text-cb-primary-400 size-4"
								/>
							</div>
							<div class="space-y-0.5">
								<p class="text-sm font-medium text-white">Weekly recap</p>
								<p class="text-xs text-zinc-500">
									A digest every Monday with the week's upcoming comebacks.
								</p>
							</div>
						</div>
						<USwitch
							:model-value="preferences.weekly_comeback"
							:disabled="isSaving"
							color="primary"
							@update:model-value="
								(v: boolean) => handlePreferenceChange('weekly_comeback', v)
							"
						/>
					</div>

					<div
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between gap-4 rounded-2xl border p-4"
					>
						<div class="flex items-center gap-3">
							<div
								class="bg-cb-primary-900/20 ring-cb-primary-900/30 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1"
							>
								<UIcon name="i-lucide-star" class="text-cb-primary-400 size-4" />
							</div>
							<div class="space-y-0.5">
								<p class="text-sm font-medium text-white">Followed artists</p>
								<p class="text-xs text-zinc-500">
									An alert whenever an artist you follow releases something.
								</p>
							</div>
						</div>
						<USwitch
							:model-value="preferences.followed_artist_alerts"
							:disabled="isSaving"
							color="primary"
							@update:model-value="
								(v: boolean) => handlePreferenceChange('followed_artist_alerts', v)
							"
						/>
					</div>
				</div>
			</div>
		</section>

		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="space-y-5">
				<div class="flex items-center justify-between gap-4">
					<div class="space-y-1">
						<h2 class="text-base font-semibold text-white">Followed artists</h2>
						<p class="text-sm text-zinc-400">
							Artists whose news and releases you want to follow.
						</p>
					</div>
					<div
						v-if="followedArtists.length"
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-full border px-3 py-1 text-xs font-medium text-zinc-400"
					>
						{{ followedArtists.length }}
					</div>
				</div>

				<div v-if="followsLoading" class="grid gap-3 sm:grid-cols-2">
					<div
						v-for="n in 4"
						:key="n"
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 h-16 animate-pulse rounded-2xl border"
					/>
				</div>

				<div v-else-if="followedArtists.length" class="grid gap-3 sm:grid-cols-2">
					<div
						v-for="artist in followedArtists"
						:key="artist.id"
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center gap-3 rounded-2xl border p-3"
					>
						<NuxtImg
							v-if="artist.image"
							:src="artist.image"
							:alt="artist.name"
							width="40"
							height="40"
							class="size-10 shrink-0 rounded-xl object-cover"
						/>
						<div
							v-else
							class="bg-cb-quinary-900/40 flex size-10 shrink-0 items-center justify-center rounded-xl"
						>
							<UIcon name="i-lucide-music" class="size-4 text-zinc-500" />
						</div>

						<div class="min-w-0 flex-1">
							<NuxtLink
								:to="`/artist/${artist.id}`"
								class="block truncate text-sm font-medium text-white hover:text-zinc-200"
							>
								{{ artist.name }}
							</NuxtLink>
							<p class="truncate text-xs text-zinc-500">
								{{ artist.type === 'GROUP' ? 'Group' : 'Solo artist' }}
							</p>
						</div>

						<UButton
							type="button"
							icon="i-lucide-x"
							color="neutral"
							variant="ghost"
							size="xs"
							:loading="isUnfollowing === artist.id"
							:disabled="isUnfollowing !== null"
							aria-label="Unfollow"
							@click="handleUnfollow(artist.id, artist.name)"
						/>
					</div>
				</div>

				<div
					v-else
					class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-6 text-center"
				>
					<UIcon name="i-lucide-star" class="mx-auto size-8 text-zinc-600" />
					<p class="mt-3 text-sm font-medium text-zinc-400">
						You are not following any artists yet.
					</p>
					<p class="mt-1 text-xs text-zinc-600">
						Visit an artist's page to follow them.
					</p>
				</div>
			</div>
		</section>
	</div>
</template>
