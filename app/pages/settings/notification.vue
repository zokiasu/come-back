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
					title: 'Notifications désactivées',
					description: "Vous ne recevrez plus d'alertes push.",
					color: 'neutral',
				})
			} else {
				const ok = await subscribe()
				if (!ok) {
					if (permission.value === 'denied') {
						toast.add({
							title: 'Permission refusée',
							description:
								'Réactivez les notifications pour ce site dans les paramètres de votre navigateur.',
							color: 'error',
						})
					}
					return
				}
				await fetchPreferences()
				toast.add({
					title: 'Notifications activées',
					description: 'Vous recevrez les alertes de comebacks.',
					color: 'success',
				})
			}
		} catch (err) {
			toast.add({
				title: 'Erreur',
				description: err instanceof Error ? err.message : 'Une erreur est survenue.',
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
				title: 'Erreur',
				description: 'Impossible de sauvegarder la préférence.',
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
				title: 'Artiste retiré',
				description: `Vous ne suivez plus ${artistName}.`,
				color: 'neutral',
			})
		} catch {
			toast.add({
				title: 'Erreur',
				description: 'Impossible de retirer cet artiste.',
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
		<!-- En-tête -->
		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="space-y-2">
				<div
					class="bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30 inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase ring-1"
				>
					Notifications
				</div>
				<h1 class="text-2xl font-semibold text-white sm:text-3xl">
					Alertes & abonnements
				</h1>
				<p class="max-w-2xl text-sm leading-6 text-zinc-400">
					Choisissez les alertes que vous souhaitez recevoir. Les notifications sont
					envoyées directement sur cet appareil via votre navigateur.
				</p>
			</div>
		</section>

		<!-- Notifications push -->
		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="space-y-5">
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-1">
						<h2 class="text-base font-semibold text-white">Notifications push</h2>
						<p class="text-sm text-zinc-400">
							Recevez des alertes même lorsque l'application est en arrière-plan.
						</p>
					</div>

					<!-- Non supporté -->
					<div
						v-if="!isSupported"
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-xl border px-3 py-2 text-xs text-zinc-400"
					>
						Non supporté
					</div>

					<!-- Toggle push -->
					<UToggle
						v-else
						:model-value="isSubscribed"
						:loading="isTogglingPush"
						:disabled="isTogglingPush"
						color="primary"
						@update:model-value="handleTogglePush"
					/>
				</div>

				<!-- Message navigateur non supporté -->
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
							Votre navigateur ou appareil ne supporte pas les notifications web push. Sur
							iOS, installez l'application depuis Safari puis ajoutez-la à l'écran
							d'accueil.
						</p>
					</div>
				</div>

				<!-- Message permission refusée -->
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
							<p class="text-sm font-medium text-white">Permission refusée</p>
							<p class="text-sm text-zinc-400">
								Pour réactiver les notifications, rendez-vous dans les paramètres de votre
								navigateur → Confidentialité → Notifications → Autorisations pour ce site.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Mes alertes (visible seulement si abonné) -->
		<section
			v-if="isSubscribed"
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="space-y-5">
				<div class="space-y-1">
					<h2 class="text-base font-semibold text-white">Mes alertes</h2>
					<p class="text-sm text-zinc-400">
						Choisissez les types de notifications que vous souhaitez recevoir.
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
					<!-- Comeback du jour -->
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
								<p class="text-sm font-medium text-white">Comeback du jour</p>
								<p class="text-xs text-zinc-500">
									Une notification chaque matin pour les sorties du jour.
								</p>
							</div>
						</div>
						<UToggle
							:model-value="preferences.daily_comeback"
							:disabled="isSaving"
							color="primary"
							@update:model-value="
								(v: boolean) => handlePreferenceChange('daily_comeback', v)
							"
						/>
					</div>

					<!-- Récap hebdomadaire -->
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
								<p class="text-sm font-medium text-white">Récap hebdomadaire</p>
								<p class="text-xs text-zinc-500">
									Un digest le lundi avec les comebacks de la semaine à venir.
								</p>
							</div>
						</div>
						<UToggle
							:model-value="preferences.weekly_comeback"
							:disabled="isSaving"
							color="primary"
							@update:model-value="
								(v: boolean) => handlePreferenceChange('weekly_comeback', v)
							"
						/>
					</div>

					<!-- Alertes artistes suivis -->
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
								<p class="text-sm font-medium text-white">Artistes suivis</p>
								<p class="text-xs text-zinc-500">
									Une alerte dès qu'un artiste que vous suivez sort quelque chose.
								</p>
							</div>
						</div>
						<UToggle
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

		<!-- Artistes suivis -->
		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="space-y-5">
				<div class="flex items-center justify-between gap-4">
					<div class="space-y-1">
						<h2 class="text-base font-semibold text-white">Artistes suivis</h2>
						<p class="text-sm text-zinc-400">
							Les artistes dont vous souhaitez suivre les actualités et sorties.
						</p>
					</div>
					<div
						v-if="followedArtists.length"
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-full border px-3 py-1 text-xs font-medium text-zinc-400"
					>
						{{ followedArtists.length }}
					</div>
				</div>

				<!-- Skeleton -->
				<div v-if="followsLoading" class="grid gap-3 sm:grid-cols-2">
					<div
						v-for="n in 4"
						:key="n"
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 h-16 animate-pulse rounded-2xl border"
					/>
				</div>

				<!-- Liste des artistes suivis -->
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
								{{ artist.type === 'GROUP' ? 'Groupe' : 'Artiste solo' }}
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
							aria-label="Ne plus suivre"
							@click="handleUnfollow(artist.id, artist.name)"
						/>
					</div>
				</div>

				<!-- État vide -->
				<div
					v-else
					class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-6 text-center"
				>
					<UIcon name="i-lucide-star" class="mx-auto size-8 text-zinc-600" />
					<p class="mt-3 text-sm font-medium text-zinc-400">
						Vous ne suivez aucun artiste pour l'instant.
					</p>
					<p class="mt-1 text-xs text-zinc-600">
						Rendez-vous sur la page d'un artiste pour le suivre.
					</p>
				</div>
			</div>
		</section>
	</div>
</template>
