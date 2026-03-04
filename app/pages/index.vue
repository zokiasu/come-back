<script setup lang="ts">
	import type { Artist, Music, News, Release } from '~/types'

	type ReleaseListItem = Release
	type ArtistListItem = Artist
	type MusicListItem = Music

	// Timestamp pour forcer le refresh
	const refreshTimestamp = ref(Date.now())
	const musicsTimestamp = ref(Date.now())
	const fallbackDiscoverMusicImage = '/slider-placeholder.webp'
	const failedDiscoverMusicImages = ref<Record<string, boolean>>({})

	// SSR-compatible data fetching avec useFetch + refresh pour temps réel
	const {
		data: comebacks,
		pending: newsFetching,
	} = await useFetch(() => `/api/news/latest?_t=${refreshTimestamp.value}`, {
		default: () => [],
		server: true,
		key: 'news-latest',
		// Pas besoin de transform car l'API retourne déjà triées par date croissante
	})

	const {
		data: releases,
		pending: releasesFetching,
	} = await useFetch('/api/releases/latest', {
		default: () => [],
		server: true,
		query: { limit: 10 },
		transform: (data: unknown[]) =>
			(data as ReleaseListItem[]).sort(
				(a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime(),
			),
	})

	const {
		data: artists,
		pending: artistsFetching,
	} = await useFetch('/api/artists/latest', {
		default: () => [],
		server: true,
		query: { limit: 10 },
		transform: (data: unknown[]) =>
			(data as ArtistListItem[]).sort(
				(a, b) =>
					new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime(),
			),
	})

	// Musiques aléatoires - client-only car changent à chaque visite
	const {
		data: musics,
		pending: musicsFetching,
		error: musicsError,
	} = await useFetch(
		() => `/api/musics/random?_t=${musicsTimestamp.value}`,
		{
			default: () => [],
			server: false,
			query: { limit: 9 },
			watch: [musicsTimestamp],
			transform: (data: unknown[]) =>
				(data as MusicListItem[]).sort(
					(a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime(),
				),
		},
	)

	const discoverMusicAutoRetried = ref(false)

	const {
		data: mvs,
		pending: mvsFetching,
	} = await useFetch('/api/musics/latest-mvs', {
		default: () => [],
		server: true,
		query: { limit: 14 },
	})

	const isTodayOrFuture = (dateValue: string) => {
		const date = new Date(dateValue)
		if (isNaN(date.getTime())) return false
		const today = new Date()
		const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
		const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
		return dateOnly.getTime() >= todayOnly.getTime()
	}

	const upcomingComebacks = computed<News[]>(() => {
		if (!comebacks.value) return []
		return [...comebacks.value]
			.filter((comeback) => isTodayOrFuture(comeback.date))
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
	})

	const comebacksToday = computed<News[]>(() => {
		if (!upcomingComebacks.value) return []
		return upcomingComebacks.value.filter((comeback) => {
			const comebacksDate = new Date(comeback.date)
			const today = new Date()
			return (
				comebacksDate.getDate() === today.getDate() &&
				comebacksDate.getMonth() === today.getMonth() &&
				comebacksDate.getFullYear() === today.getFullYear()
			)
		})
	})

	const upcomingFutureCount = computed(() =>
		Math.max(upcomingComebacks.value.length - comebacksToday.value.length, 0),
	)

	const artistsForCards = computed(() =>
		(artists.value || []).map((artist) => ({
			id: artist.id,
			name: artist.name,
			type: artist.type ?? undefined,
			image: artist.image ?? undefined,
		})),
	)

	const reloadDiscoverMusic = () => {
		failedDiscoverMusicImages.value = {}
		musicsTimestamp.value = Date.now()
	}

	const getDiscoverMusicKey = (music: Music) =>
		String(music.id_youtube_music ?? music.id ?? music.name ?? '')

	const getDiscoverMusicImage = (music: Music): string => {
		const key = getDiscoverMusicKey(music)
		if (failedDiscoverMusicImages.value[key]) return fallbackDiscoverMusicImage
		return getMusicThumbnail(music) || fallbackDiscoverMusicImage
	}

	const onDiscoverMusicImageError = (music: Music) => {
		failedDiscoverMusicImages.value[getDiscoverMusicKey(music)] = true
	}

	watch(
		() => [musicsFetching.value, musics.value?.length ?? 0] as const,
		([isPending, musicsCount]) => {
			if (isPending) return
			if (discoverMusicAutoRetried.value) return
			if (musicsCount > 0) return
			discoverMusicAutoRetried.value = true
			reloadDiscoverMusic()
		},
	)

	const getMusicThumbnail = (music: Music): string => {
		const thumbnails = music.thumbnails
		if (!Array.isArray(thumbnails) || thumbnails.length === 0) return ''
		const last = thumbnails[thumbnails.length-1]
		if (!last || typeof last !== 'object' || !('url' in last)) return ''
		const url = (last as { url?: unknown }).url
		return typeof url === 'string' ? url : ''
	}

	const { addToPlaylist, isCurrentlyPlaying } = useYouTube()

	const playDiscoverMusic = (music: Music) => {
		const videoId = (music as Music & { id_youtube_music?: string | null }).id_youtube_music
		if (!videoId) return
		const artistName =
			(music as Music & { artists?: Array<{ name?: string }> }).artists?.[0]?.name ||
			''
		addToPlaylist(videoId, music.name ?? '', artistName, getMusicThumbnail(music))
	}

	// 🔄 Temps réel - Écoute les changements en base après hydratation
	onMounted(() => {
		const supabase = useSupabaseClient()

		// Fonction de refresh des news
		const refreshNewsData = async () => {
			try {
				const freshData = await $fetch(`/api/news/latest?_t=${Date.now()}`)
				comebacks.value = freshData // Pas besoin de tri, déjà triées par l'API
			} catch (error) {
				console.error('Error refreshing news:', error)
			}
		}

		// Channel pour les news/comebacks (écoute aussi la table de jonction pour les artistes)
		const newsChannel = supabase
			.channel('news-realtime')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'news',
				},
				refreshNewsData,
			)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'news_artists_junction',
				},
				refreshNewsData,
			)
			.subscribe()

		// Channel pour les releases
		const releasesChannel = supabase
			.channel('releases-realtime')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'releases',
				},
				async (_payload) => {
					// Force un refresh direct avec $fetch (bypass du cache useFetch)
					try {
						const freshData = await $fetch('/api/releases/latest', {
							query: { limit: 8 },
						})
						releases.value = freshData.sort(
							(a, b) =>
								new Date(b.date || '').getTime() - new Date(a.date || '').getTime(),
						)
					} catch (error) {
						console.error('Error refreshing releases:', error)
					}
				},
			)
			.subscribe()

		// Channel pour les artists
		const artistsChannel = supabase
			.channel('artists-realtime')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'artists',
				},
				async (_payload) => {
					// Force un refresh direct avec $fetch (bypass du cache useFetch)
					try {
						const freshData = await $fetch('/api/artists/latest', {
							query: { limit: 8 },
						})
						artists.value = freshData.sort(
							(a, b) =>
								new Date(b.created_at || '').getTime() -
								new Date(a.created_at || '').getTime(),
						)
					} catch (error) {
						console.error('Error refreshing artists:', error)
					}
				},
			)
			.subscribe()

		// Channel pour les musics (MVs et musiques random)
		const musicsChannel = supabase
			.channel('musics-realtime')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'musics',
				},
				async (_payload) => {
					// Force un refresh direct avec $fetch (bypass du cache useFetch)
					try {
						const freshData = await $fetch('/api/musics/latest-mvs', {
							query: { limit: 14 },
						})
						mvs.value = freshData
					} catch (error) {
						console.error('Error refreshing MVs:', error)
					}

					// Note: les musiques random ne se refresh pas auto pour garder l'aspect "découverte"
				},
			)
			.subscribe()

		// Nettoyage des channels au démontage
		onUnmounted(() => {
			newsChannel.unsubscribe()
			releasesChannel.unsubscribe()
			artistsChannel.unsubscribe()
			musicsChannel.unsubscribe()
		})
	})

	// SEO Meta Tags dynamiques
	useSeoMeta({
		title: 'Comeback - Track every next release by your favorite artists',
		ogTitle: 'Comeback - Track every next release by your favorite artists',
		description:
			"Don't miss any Comeback. Track every next release by your favorite artists.",
		ogDescription:
			"Don't miss any Comeback. Track every next release by your favorite artists.",
		ogImage: '/ogp.png',
		twitterCard: 'summary_large_image',
		twitterImage: '/ogp.png',
	})
</script>

<template>
	<div class="flex-1">
		<HomeSlider :news-today="comebacksToday" />
		<section class="mx-auto w-full max-w-[100rem] space-y-10 px-4 pb-12 pt-4 lg:px-8">
			<div class="space-y-12">
				<div class="rounded-3xl border border-cb-quinary-900 bg-cb-secondary-950/70 p-4 md:p-6">
					<div class="space-y-4">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div class="space-y-1">
								<h2 class="text-xl font-semibold md:text-2xl">Comebacks Reported</h2>
								<p class="text-cb-tertiary-300 text-xs md:text-sm">
									Latest community reports, sorted by comeback date.
								</p>
							</div>
							<div class="flex flex-wrap items-center justify-end gap-2">
								<span
									class="rounded-full border border-cb-quinary-900 bg-cb-quinary-900/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cb-tertiary-200"
								>
									Community feed
								</span>
								<span
									class="hidden rounded-full border border-cb-primary-900/60 bg-cb-primary-900/25 px-2.5 py-1 text-[11px] font-semibold text-cb-tertiary-100 md:inline-flex"
								>
									Upcoming: {{ upcomingFutureCount }}
								</span>
								<span
									class="hidden rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 md:inline-flex"
								>
									Today: {{ comebacksToday.length }}
								</span>
							</div>
						</div>

						<LazyComebackReported
							v-if="upcomingComebacks.length > 0 && !newsFetching"
							:comeback-list="upcomingComebacks"
							:show-title="false"
						/>

						<div
							v-else-if="newsFetching"
							class="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3"
						>
							<SkeletonDefault class="h-28 w-full rounded-2xl" />
							<SkeletonDefault class="h-28 w-full rounded-2xl" />
							<SkeletonDefault class="h-28 w-full rounded-2xl" />
							<SkeletonDefault class="h-28 w-full rounded-2xl" />
							<SkeletonDefault class="h-28 w-full rounded-2xl" />
							<SkeletonDefault class="h-28 w-full rounded-2xl" />
						</div>

						<div
							v-else
							class="border-cb-quinary-900 bg-cb-quinary-900/60 rounded-2xl border p-6 text-center"
						>
							<p class="text-cb-tertiary-100 text-sm font-semibold">
								No comebacks reported yet.
							</p>
							<p class="text-cb-tertiary-300 mt-1 text-xs">
								New community updates will appear here automatically.
							</p>
						</div>
					</div>
				</div>

				<ClientOnly>
					<div class="space-y-4">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<h2 class="text-xl font-semibold">Discover Music</h2>
							<UButton
								label="Reload"
								variant="ghost"
								color="neutral"
								class="text-cb-tertiary-300 hover:text-white"
								icon="i-material-symbols-refresh"
								:loading="musicsFetching"
								@click="reloadDiscoverMusic"
							/>
						</div>
						<div v-if="musics.length > 0" class="space-y-5">
							<div class="grid grid-cols-3 gap-2 md:hidden">
								<button
									v-for="music in musics"
									:key="music.id_youtube_music ?? music.id"
									type="button"
									class="relative aspect-square overflow-hidden rounded-lg bg-cb-quinary-900"
									@click="playDiscoverMusic(music)"
								>
									<NuxtImg
										:src="getDiscoverMusicImage(music)"
										:alt="music.name ?? ''"
										format="webp"
										class="h-full w-full object-cover"
										@error="onDiscoverMusicImageError(music)"
									/>
									<div
										class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2 pb-2 pt-6"
									>
										<p class="truncate text-xs font-semibold text-white">
											{{ music.name }}
										</p>
									</div>
									<span
										v-if="
											music.id_youtube_music &&
											isCurrentlyPlaying(music.id_youtube_music)
										"
										class="absolute right-2 top-2 rounded-full bg-cb-primary-900/90 px-2 py-1 text-[10px] font-semibold text-white"
									>
										Playing
									</span>
								</button>
							</div>

							<div class="hidden grid-cols-1 gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
								<MusicDisplay
									v-for="music in musics"
									:key="music.id_youtube_music ?? music.id"
									:artist-id="music.artists?.[0]?.id ?? ''"
									:artist-name="music.artists?.[0]?.name ?? ''"
									:music-id="music.id_youtube_music ?? ''"
									:music-name="music.name ?? ''"
									:music-image="getDiscoverMusicImage(music)"
									:duration="music?.duration?.toString() || '0'"
									class="bg-cb-quinary-900 w-full"
									:class="{
										'opacity-50 transition-opacity duration-300': musicsFetching,
									}"
								/>
							</div>
						</div>
						<div
							v-else-if="musicsFetching"
							class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
						>
							<SkeletonDefault class="h-16 w-full rounded-lg" />
							<SkeletonDefault class="h-16 w-full rounded-lg" />
							<SkeletonDefault class="h-16 w-full rounded-lg" />
							<SkeletonDefault class="h-16 w-full rounded-lg" />
							<SkeletonDefault class="h-16 w-full rounded-lg" />
							<SkeletonDefault class="h-16 w-full rounded-lg" />
							<SkeletonDefault class="h-16 w-full rounded-lg" />
							<SkeletonDefault class="h-16 w-full rounded-lg" />
							<SkeletonDefault class="h-16 w-full rounded-lg" />
						</div>
						<div
							v-else
							class="border-cb-quinary-900 bg-cb-quinary-900/60 rounded-2xl border p-4 text-center"
						>
							<p class="text-cb-tertiary-100 text-sm font-semibold">
								Unable to load Discover Music.
							</p>
							<p class="text-cb-tertiary-300 mt-1 text-xs">
								{{ musicsError ? 'A temporary error occurred.' : 'No music available right now.' }}
							</p>
							<UButton
								label="Retry"
								variant="soft"
								size="sm"
								class="mt-3 bg-cb-quinary-900 hover:bg-cb-quinary-900/80 text-white"
								icon="i-material-symbols-refresh"
								@click="reloadDiscoverMusic"
							/>
						</div>
					</div>
					<template #fallback>
						<div class="space-y-4">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<h2 class="text-xl font-semibold">Discover Music</h2>
								<UButton
									label="Reload"
									variant="ghost"
									color="neutral"
									class="text-cb-tertiary-300 hover:text-white"
									icon="i-material-symbols-refresh"
									disabled
								/>
							</div>
							<div class="grid grid-cols-3 gap-2 md:grid-cols-3 lg:grid-cols-3">
								<SkeletonDefault
									v-for="i in 9"
									:key="`discover-skeleton-${i}`"
									class="aspect-square w-full rounded-lg"
								/>
							</div>
						</div>
					</template>
				</ClientOnly>

				<div class="space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="text-xl font-semibold">Latest MV</h2>
					</div>
					<div v-if="mvs.length > 0 && !mvsFetching" class="space-y-8">
						<LazyDiscoverMV :mvs="mvs" />
					</div>
					<div v-else-if="mvsFetching" class="space-y-4">
						<SkeletonDefault class="aspect-video w-full rounded-lg" />
						<div class="flex justify-center space-x-3">
							<SkeletonDefault
								v-for="i in 7"
								:key="i"
								class="aspect-video w-20 shrink-0 rounded-lg md:w-24"
							/>
						</div>
					</div>
				</div>

				<div class="space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="text-xl font-semibold">Recent Releases</h2>
						<UButton
							to="/calendar"
							variant="ghost"
							color="neutral"
							class="text-cb-tertiary-300 hover:text-white"
							size="sm"
							icon="i-heroicons-calendar-days"
							label="Calendar"
						/>
					</div>
					<LazyRecentReleases
						v-if="releases.length > 0 && !releasesFetching"
						:releases="releases"
						:show-title="false"
					/>
					<div
						v-else-if="releasesFetching"
						class="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
					>
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
					</div>
				</div>

				<div class="space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="text-xl font-semibold">Latest artists</h2>
						<UButton
							to="/artist"
							variant="ghost"
							color="neutral"
							class="text-cb-tertiary-300 hover:text-white"
							size="sm"
							icon="i-heroicons-user-group"
							label="All artists"
						/>
					</div>
					<LazyArtistAdded
						v-if="artists.length > 0 && !artistsFetching"
						:artists="artistsForCards"
						:show-title="false"
					/>
					<div
						v-else-if="artistsFetching"
						class="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
					>
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
						<SkeletonDefault class="h-52 w-full rounded-lg" />
					</div>
				</div>
			</div>
		</section>
	</div>
</template>
