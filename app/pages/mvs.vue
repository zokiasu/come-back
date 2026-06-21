<template>
	<div class="px-4 py-4 lg:px-6 lg:py-6">
		<div class="mx-auto flex w-full max-w-[96rem] flex-col gap-6">
			<header
				class="border-cb-quaternary-800/70 flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between"
			>
				<div class="min-w-0 space-y-2">
					<div
						class="text-cb-primary-400 flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase"
					>
						<UIcon name="i-lucide-clapperboard" class="size-4" />
						<span>Music videos</span>
					</div>
					<div class="space-y-1">
						<h1 class="text-2xl font-bold text-white md:text-3xl">MV releases by day</h1>
						<p class="text-cb-tertiary-500 max-w-2xl text-sm">
							Browse recent music videos grouped by release day, with each day kept as a
							horizontal row.
						</p>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<div class="bg-cb-quaternary-950 flex items-center rounded-lg p-1">
						<UButton
							type="button"
							size="sm"
							:color="orderDirection === 'desc' ? 'primary' : 'neutral'"
							:variant="orderDirection === 'desc' ? 'solid' : 'ghost'"
							@click="setOrderDirection('desc')"
						>
							Newest
						</UButton>
						<UButton
							type="button"
							size="sm"
							:color="orderDirection === 'asc' ? 'primary' : 'neutral'"
							:variant="orderDirection === 'asc' ? 'solid' : 'ghost'"
							@click="setOrderDirection('asc')"
						>
							Oldest
						</UButton>
					</div>

					<UButton
						type="button"
						color="neutral"
						variant="outline"
						size="sm"
						@click="navigateToMvFilters"
					>
						<UIcon name="i-lucide-sliders-horizontal" class="size-4" />
						Advanced filters
					</UButton>
				</div>
			</header>

			<div
				v-if="dayGroups.length > 0"
				class="text-cb-tertiary-500 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
			>
				<span>{{ loadedCount }} / {{ totalMvs }} MVs loaded</span>
				<span>{{ dayGroups.length }} days visible</span>
			</div>

			<PageHeroLoader
				v-if="loading && firstLoad"
				title="Loading music videos"
				description="We are preparing the latest MV release days now."
			/>

			<div v-else-if="dayGroups.length > 0" class="space-y-8">
				<section
					v-for="group in dayGroups"
					:key="group.date"
					class="border-cb-quaternary-800/60 border-b pb-6 last:border-b-0 last:pb-0"
				>
					<div
						class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
					>
						<div class="min-w-0">
							<p
								class="text-cb-primary-400 text-[11px] font-semibold tracking-[0.18em] uppercase"
							>
								{{ formatDaySubtitle(group.date) }}
							</p>
							<h2 class="truncate text-xl font-semibold text-white">
								{{ formatDayTitle(group.date) }}
							</h2>
						</div>
						<span class="text-cb-tertiary-500 text-xs">
							{{ group.musics.length }} {{ group.musics.length > 1 ? 'videos' : 'video' }}
						</span>
					</div>

					<div class="scrollBarLight flex gap-3 overflow-x-auto pb-3">
						<UButton
							v-for="music in group.musics"
							:key="music.id"
							type="button"
							color="neutral"
							variant="ghost"
							:disabled="!music.id_youtube_music"
							:aria-label="getMvAriaLabel(music)"
							class="group hover:bg-cb-quaternary-950/80 w-[11rem] shrink-0 rounded-lg !p-2 text-left transition disabled:opacity-70 sm:w-[13rem] md:w-[14rem]"
							@click="openMvPreview(music)"
						>
							<div class="flex w-full flex-col">
								<div
									class="bg-cb-quaternary-950 relative aspect-video w-full overflow-hidden rounded-md"
								>
									<NuxtImg
										:src="getMusicThumbnail(music)"
										:alt="`${music.name} thumbnail`"
										class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
										format="webp"
										loading="lazy"
									/>
									<div
										class="absolute inset-0 bg-black/0 transition group-hover:bg-black/20"
									/>
									<div
										v-if="music.id_youtube_music"
										class="bg-cb-primary-900/90 absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full text-white shadow-lg shadow-black/30"
									>
										<UIcon name="i-lucide-play" class="size-4 translate-x-px" />
									</div>
								</div>

								<div class="min-h-[4.5rem] pt-2">
									<p class="line-clamp-2 text-sm leading-5 font-semibold text-white">
										{{ music.name }}
									</p>
									<p class="text-cb-tertiary-500 mt-1 truncate text-xs">
										{{ formatArtists(music.artists) }}
									</p>
								</div>
							</div>
						</UButton>
					</div>
				</section>
			</div>

			<p
				v-else-if="!loading && loadError"
				class="bg-cb-quaternary-950 rounded p-5 text-center text-sm text-red-300"
			>
				{{ loadError }}
			</p>

			<p
				v-else-if="!loading"
				class="bg-cb-quaternary-950 rounded p-5 text-center text-sm"
			>
				No music videos found
			</p>

			<div ref="loadMoreTrigger" class="flex min-h-16 items-center justify-center py-4">
				<div
					v-if="loading && !firstLoad"
					class="text-cb-tertiary-500 flex items-center gap-2 text-xs"
				>
					<UIcon name="line-md:loading-twotone-loop" class="size-4 animate-spin" />
					<span>Loading more days...</span>
				</div>

				<UButton
					v-else-if="hasMore && dayGroups.length > 0"
					type="button"
					color="primary"
					variant="outline"
					@click="loadMvs(false)"
				>
					Load more
				</UButton>

				<p
					v-else-if="dayGroups.length > 0"
					class="text-cb-tertiary-600 text-center text-xs"
				>
					All available MVs are loaded.
				</p>
			</div>
		</div>

		<ModalMvPreview
			:open="isMvPreviewOpen"
			:video-id="mvPreview?.videoId"
			:title="mvPreview?.title"
			@update:open="isMvPreviewOpen = $event"
		/>
	</div>
</template>

<script setup lang="ts">
	import { useIntersectionObserver } from '@vueuse/core'
	import type { Music } from '~/types'
	import { useSupabaseMusic } from '~/composables/Supabase/useSupabaseMusic'

	type Thumbnail = {
		url?: string | null
		width?: number | null
		height?: number | null
	}

	type DayGroup = {
		date: string
		musics: Music[]
	}

	const UNDATED_GROUP_KEY = 'undated'
	const MV_PAGE_LIMIT = 36

	const { getMusicsByPage } = useSupabaseMusic()
	const loadMoreTrigger = ref<HTMLElement | null>(null)

	const mvs = ref<Music[]>([])
	const currentPage = ref(1)
	const totalPages = ref(1)
	const totalMvs = ref(0)
	const loading = ref(false)
	const firstLoad = ref(true)
	const loadError = ref<string | null>(null)
	const orderDirection = ref<'asc' | 'desc'>('desc')
	const autoLoadEnabled = ref(false)
	const mvPreview = ref<{ videoId: string; title: string } | null>(null)

	const loadedCount = computed(() => mvs.value.length)
	const hasMore = computed(() => currentPage.value <= totalPages.value)
	const isMvPreviewOpen = computed({
		get: () => Boolean(mvPreview.value),
		set: (value: boolean) => {
			if (!value) {
				mvPreview.value = null
			}
		},
	})

	const dayGroups = computed<DayGroup[]>(() => {
		const groups = new Map<string, Music[]>()
		const orderedDates: string[] = []

		for (const music of mvs.value) {
			const dateKey = getDateKey(music.date)

			if (!groups.has(dateKey)) {
				groups.set(dateKey, [])
				orderedDates.push(dateKey)
			}

			groups.get(dateKey)?.push(music)
		}

		return orderedDates.map((date) => ({
			date,
			musics: groups.get(date) || [],
		}))
	})

	const getDateKey = (date: string | null | undefined): string => {
		if (!date) return UNDATED_GROUP_KEY
		return date.slice(0, 10)
	}

	const parseDateKey = (dateKey: string): Date | null => {
		if (dateKey === UNDATED_GROUP_KEY) return null
		return new Date(`${dateKey}T00:00:00`)
	}

	const formatDayTitle = (dateKey: string): string => {
		const date = parseDateKey(dateKey)
		if (!date) return 'Undated'

		return new Intl.DateTimeFormat('en-US', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}).format(date)
	}

	const formatDaySubtitle = (dateKey: string): string => {
		const date = parseDateKey(dateKey)
		if (!date) return 'No release date'

		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
		}).format(date)
	}

	const formatArtists = (artists: Music['artists'] = []): string => {
		return (
			artists
				.map((artist) => artist.name.trim())
				.filter(Boolean)
				.join(', ') || 'Unknown artist'
		)
	}

	const isThumbnail = (value: unknown): value is Thumbnail => {
		return typeof value === 'object' && value !== null && 'url' in value
	}

	const getMusicThumbnail = (music: Music): string => {
		if (Array.isArray(music.thumbnails)) {
			const thumbnails = music.thumbnails.filter(isThumbnail)
			const preferredThumbnail = [...thumbnails]
				.reverse()
				.find((thumbnail) => Boolean(thumbnail.url))

			if (preferredThumbnail?.url) {
				return preferredThumbnail.url
			}
		}

		if (music.id_youtube_music) {
			return `https://img.youtube.com/vi/${music.id_youtube_music}/hqdefault.jpg`
		}

		return '/slider-placeholder.webp'
	}

	const getMvAriaLabel = (music: Music): string => {
		if (!music.id_youtube_music) return `${music.name} has no MV preview available`
		return `Open ${music.name} MV`
	}

	const appendUniqueMvs = (nextMvs: Music[]) => {
		mvs.value = Array.from(
			new Map([...mvs.value, ...nextMvs].map((music) => [music.id, music])).values(),
		)
	}

	const loadMvs = async (isFirstCall = false): Promise<void> => {
		if (loading.value) return

		loading.value = true
		loadError.value = null

		if (isFirstCall) {
			currentPage.value = 1
			totalPages.value = 1
			totalMvs.value = 0
			mvs.value = []
			firstLoad.value = true
		} else {
			firstLoad.value = false
		}

		try {
			const pageToLoad = isFirstCall ? 1 : currentPage.value
			const result = await getMusicsByPage(pageToLoad, MV_PAGE_LIMIT, {
				orderBy: 'date',
				orderDirection: orderDirection.value,
				ismv: true,
			})

			totalMvs.value = result.total
			totalPages.value = result.totalPages

			if (isFirstCall) {
				mvs.value = Array.from(
					new Map(result.musics.map((music) => [music.id, music])).values(),
				)
			} else {
				appendUniqueMvs(result.musics)
			}

			currentPage.value = pageToLoad + 1
		} catch (error) {
			console.error('Error loading MV releases:', error)
			loadError.value = 'Unable to load music videos.'
		} finally {
			loading.value = false
			firstLoad.value = false
			void loadMoreIfViewportNeedsContent()
		}
	}

	const loadMoreIfViewportNeedsContent = async (): Promise<void> => {
		if (
			!import.meta.client ||
			!autoLoadEnabled.value ||
			loading.value ||
			!hasMore.value ||
			loadError.value
		) {
			return
		}

		await nextTick()
		const trigger = loadMoreTrigger.value
		if (!trigger) return

		const triggerTop = trigger.getBoundingClientRect().top
		if (triggerTop <= window.innerHeight + 700) {
			await loadMvs(false)
		}
	}

	const setOrderDirection = async (direction: 'asc' | 'desc') => {
		if (direction === orderDirection.value) return

		orderDirection.value = direction
		await loadMvs(true)
	}

	const navigateToMvFilters = async (): Promise<void> => {
		await navigateTo({
			path: '/music',
			query: { ismv: 'true', orderDirection: orderDirection.value },
		})
	}

	const openMvPreview = (music: Music) => {
		if (!music.id_youtube_music) return

		mvPreview.value = {
			videoId: music.id_youtube_music,
			title: music.name,
		}
	}

	useIntersectionObserver(
		loadMoreTrigger,
		([entry]) => {
			if (entry?.isIntersecting && autoLoadEnabled.value && !loadError.value) {
				void loadMvs(false)
			}
		},
		{
			rootMargin: '700px 0px',
			threshold: 0,
		},
	)

	onMounted(async () => {
		await loadMvs(true)
		autoLoadEnabled.value = true
		await loadMoreIfViewportNeedsContent()
	})

	useHead({
		title: 'MV Releases',
		meta: [
			{
				name: 'description',
				content: 'Browse music video releases grouped by day.',
			},
		],
	})
</script>
