<script setup lang="ts">
	import type { Music, Artist, Release, News } from '~/types'
	import { useSupabaseNews } from '~/composables/Supabase/useSupabaseNews'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useSupabaseMusic } from '~/composables/Supabase/useSupabaseMusic'

	const { getRealtimeLastestNewsAdded } = useSupabaseNews()
	const { getRealtimeLastestReleasesAdded } = useSupabaseRelease()
	const { getRealtimeLastestArtistsAdded } = useSupabaseArtist()
	const { getRandomMusics, getLatestMVs } = useSupabaseMusic()

	// SSR-compatible data fetching avec useFetch
	const { data: comebacks, pending: newsFetching } = await useFetch('/api/news/latest', {
		default: () => [],
		server: true,
		transform: (data: any[]) =>
			data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
	})

	const { data: releases, pending: releasesFetching } = await useFetch(
		'/api/releases/latest',
		{
			default: () => [],
			server: true,
			query: { limit: 8 },
			transform: (data: any[]) =>
				data.sort(
					(a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime(),
				),
		},
	)

	const { data: artists, pending: artistsFetching } = await useFetch(
		'/api/artists/latest',
		{
			default: () => [],
			server: true,
			query: { limit: 8 },
			transform: (data: any[]) =>
				data.sort(
					(a, b) =>
						new Date(b.created_at || '').getTime() -
						new Date(a.created_at || '').getTime(),
				),
		},
	)

	// Musiques aléatoires - client-only car changent à chaque visite
	const {
		data: musics,
		pending: musicsFetching,
		refresh: refreshMusics,
	} = await useFetch('/api/musics/random', {
		default: () => [],
		server: false,
		query: { limit: 4 },
		transform: (data: any[]) =>
			data.sort(
				(a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime(),
			),
	})

	const { data: mvs, pending: mvsFetching } = await useFetch('/api/musics/latest-mvs', {
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

	const reloadDiscoverMusic = async () => {
		await refreshMusics()
	}

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
		<!-- Home Header -->
		<HomeSlider :news-today="comebacksToday" />
		<!-- Home Body -->
		<section class="container mx-auto space-y-16 p-5 py-10 2xl:space-y-20">
			<!-- Comeback Reported List -->
			<LazyComebackReported
				v-if="comebacks.length > 0 && !newsFetching"
				:comeback-list="comebacks"
			/>
			<div v-else-if="newsFetching" class="grid grid-cols-1 gap-5 xl:grid-cols-3">
				<SkeletonDefault class="h-16 w-full rounded-lg" />
				<SkeletonDefault class="h-16 w-full rounded-lg" />
				<SkeletonDefault class="h-16 w-full rounded-lg" />
				<SkeletonDefault class="h-16 w-full rounded-lg" />
				<SkeletonDefault class="h-16 w-full rounded-lg" />
				<SkeletonDefault class="h-16 w-full rounded-lg" />
			</div>

			<!-- Discover Music -->
			<div
				v-if="musics.length > 0 && !musicsFetching"
				class="space-y-8 text-center xl:space-y-10"
			>
				<p class="text-xl font-bold lg:text-4xl">Discover Music</p>
				<div class="space-y-5">
					<div class="grid grid-cols-2 gap-5 xl:grid-cols-4">
						<LazyDiscoverMusic v-for="music in musics" :key="music.id" :music="music" />
					</div>
					<UButton
						label="Reload"
						variant="ghost"
						class="bg-cb-quaternary-950 mx-auto w-fit rounded px-3 py-1 text-white"
						icon="i-material-symbols-refresh"
						@click="reloadDiscoverMusic"
					/>
				</div>
			</div>
			<div v-else-if="musicsFetching" class="grid grid-cols-2 gap-5 xl:grid-cols-4">
				<SkeletonDefault class="h-80 w-full rounded-lg" />
				<SkeletonDefault class="h-80 w-full rounded-lg" />
				<SkeletonDefault class="h-80 w-full rounded-lg" />
				<SkeletonDefault class="h-80 w-full rounded-lg" />
			</div>

			<!-- Latest MV -->
			<div
				v-if="mvs.length > 0 && !mvsFetching"
				class="space-y-8 text-center xl:space-y-10"
			>
				<p class="text-xl font-bold lg:text-4xl">Latest MV</p>
				<LazyDiscoverMV :mvs="mvs" />
			</div>
			<div v-else-if="mvsFetching" class="space-y-4">
				<p class="text-center text-xl font-bold lg:text-4xl">Latest MV</p>
				<SkeletonDefault class="aspect-video w-full rounded-lg" />
				<div class="flex justify-center space-x-3">
					<SkeletonDefault
						v-for="i in 7"
						:key="i"
						class="aspect-video w-20 flex-shrink-0 rounded-lg md:w-24"
					/>
				</div>
			</div>

			<!-- Recent Release -->
			<LazyRecentReleases
				v-if="releases.length > 0 && !releasesFetching"
				:releases="releases"
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

			<!-- Last Artist Added -->
			<LazyArtistAdded v-if="artists.length > 0 && !artistsFetching" :artists="artists" />
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
		</section>
	</div>
</template>
