<script setup lang="ts">
	import type { Artist, Music, News, Release } from '~/types'

	type ReleaseListItem = Release
	type ArtistListItem = Artist
	type MusicListItem = Music

	// Timestamp pour forcer le refresh
	const refreshTimestamp = ref(Date.now())
	const musicsTimestamp = ref(Date.now())

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
	const { data: musics, pending: musicsFetching } = await useFetch(
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

	const {
		data: mvs,
		pending: mvsFetching,
	} = await useFetch('/api/musics/latest-mvs', {
		default: () => [],
		server: true,
		query: { limit: 14 },
	})

	const comebacksToday = computed<News[]>(() => {
		if (!comebacks.value) return []
		return comebacks.value.filter((comeback) => {
			const comebacksDate = new Date(comeback.date)
			const today = new Date()
			return (
				comebacksDate.getDate() === today.getDate() &&
				comebacksDate.getMonth() === today.getMonth() &&
				comebacksDate.getFullYear() === today.getFullYear()
			)
		})
	})

	const artistsForCards = computed(() =>
		(artists.value || []).map((artist) => ({
			id: artist.id,
			name: artist.name,
			type: artist.type ?? undefined,
			image: artist.image ?? undefined,
		})),
	)

	const reloadDiscoverMusic = () => {
		musicsTimestamp.value = Date.now()
	}

	const getMusicThumbnail = (music: Music): string => {
		const thumbnails = music.thumbnails
		if (!Array.isArray(thumbnails) || thumbnails.length === 0) return ''
		const first = thumbnails[0]
		if (!first || typeof first !== 'object' || !('url' in first)) return ''
		const url = (first as { url?: unknown }).url
		return typeof url === 'string' ? url : ''
	}

	const getMusicLink = (music: Music): string => {
		const releases = (music as Music & { releases?: Array<{ id: string }> }).releases
		const artists = (music as Music & { artists?: Array<{ id: string }> }).artists
		if (releases?.[0]?.id) return `/release/${releases[0].id}`
		if (artists?.[0]?.id) return `/artist/${artists[0].id}`
		return '/'
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
			<!-- <HomeSlider :news-today="comebacksToday" /> -->
		<section class="mx-auto w-full max-w-[100rem] space-y-10 px-4 pb-12 pt-4 lg:px-8">
			<div
				class="rounded-3xl border border-cb-quinary-900/60 bg-gradient-to-br from-cb-quaternary-950 via-cb-secondary-950 to-cb-quinary-900/70 p-6 lg:p-8"
			>
				<div class="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
					<div class="space-y-5">
						<p class="text-3xl font-semibold lg:text-4xl xl:text-5xl">
							Welcome back
						</p>
					</div>
					<div class="overflow-hidden rounded-2xl border border-cb-quinary-900/60">
						<HomeSlider :news-today="comebacksToday" />
					</div>
				</div>
			</div>

			<div class="space-y-12">
				<div class="space-y-4">
					<h2 class="text-xl font-semibold">Comebacks Reported</h2>
					<LazyComebackReported
						v-if="comebacks.length > 0 && !newsFetching"
						:comeback-list="comebacks"
						:show-title="false"
					/>
					<div v-else-if="newsFetching" class="grid grid-cols-1 gap-5 xl:grid-cols-3">
						<SkeletonDefault class="h-16 w-full rounded-lg" />
						<SkeletonDefault class="h-16 w-full rounded-lg" />
						<SkeletonDefault class="h-16 w-full rounded-lg" />
						<SkeletonDefault class="h-16 w-full rounded-lg" />
						<SkeletonDefault class="h-16 w-full rounded-lg" />
						<SkeletonDefault class="h-16 w-full rounded-lg" />
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
										:src="getMusicThumbnail(music)"
										:alt="music.name ?? ''"
										format="webp"
										class="h-full w-full object-cover"
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
									:music-image="getMusicThumbnail(music)"
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
					</div>
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
