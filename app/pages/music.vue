<template>
	<div class="flex h-[calc(100vh-5rem)] overflow-hidden">
		<div ref="scrollContainer" class="scrollBarLight min-w-0 flex-1 overflow-y-auto p-5">
			<div class="mb-4">
				<h1 class="text-xl font-bold">Explore music</h1>
				<p class="text-cb-tertiary-500 text-xs">
					Listen to recent tracks and refine the list with filters.
				</p>
			</div>

			<div class="mb-4 space-y-2">
				<div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
					<UInput
						v-model="search"
						placeholder="Search music..."
						class="w-full"
					/>
					<UInputMenu
						v-model="selectedArtistsWithLabel"
						:items="artistsForMenu"
						by="id"
						multiple
						placeholder="Artists..."
						searchable
						searchable-placeholder="Search for an artist..."
						class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
						:ui="{
							content: 'bg-cb-quaternary-950',
							item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
						}"
					/>
					<UInputMenu
						v-model="selectedYearsWithLabel"
						:items="yearsForMenu"
						by="value"
						multiple
						placeholder="Years..."
						searchable
						searchable-placeholder="Search..."
						class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
						:ui="{
							content: 'bg-cb-quaternary-950',
							item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
						}"
					/>
					<UInputMenu
						v-model="selectedStylesWithLabel"
						:items="stylesForMenu"
						by="value"
						multiple
						placeholder="Styles..."
						searchable
						searchable-placeholder="Search..."
						class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
						:ui="{
							content: 'bg-cb-quaternary-950',
							item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
						}"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<UButton color="secondary" variant="outline" size="xs" @click="resetFilters">
						Reset
					</UButton>
					<UButton
						color="neutral"
						variant="outline"
						size="xs"
						@click="toggleOrderDirection"
					>
						<UIcon
							name="material-symbols-light:sort"
							class="size-4"
							:class="orderDirection === 'desc' ? 'rotate-180' : ''"
						/>
						{{ orderDirection === 'desc' ? 'Newest first' : 'Oldest first' }}
					</UButton>
					<UCheckbox v-model="isMv" label="MVs only" />

					<span class="text-cb-tertiary-500 ml-auto text-xs">
						{{ musicsList.length }} / {{ totalMusics }} results
					</span>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
				<div
					v-for="music in musicsList"
					:key="music.id"
					class="bg-cb-quinary-900 group relative flex items-center gap-3 rounded p-2"
				>
					<button
						v-if="music.id_youtube_music"
						type="button"
						class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
						:class="
							isCurrentlyPlaying(music.id_youtube_music)
								? 'bg-cb-primary-900'
								: 'bg-cb-quaternary-950 hover:bg-cb-primary-900'
						"
						@click.stop="handlePlayMusic(music)"
					>
						<UIcon
							:name="
								isCurrentlyPlaying(music.id_youtube_music)
									? 'i-heroicons-pause-solid'
									: 'i-heroicons-play-solid'
							"
							class="size-5 text-white"
						/>
					</button>
					<div v-else class="size-10 shrink-0" />

					<NuxtImg
						:src="getMusicThumbnailFromList(music) || '/slider-placeholder.webp'"
						:alt="music.name"
						class="h-12 w-12 shrink-0 rounded object-cover"
						format="webp"
						loading="lazy"
					/>

					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{{ music.name }}</p>
						<p class="text-cb-tertiary-500 truncate text-xs">
							{{ formatArtists(music.artists) }}
						</p>
						<div class="mt-1 flex items-center gap-2">
							<span v-if="music.date" class="text-cb-tertiary-400 text-xs">
								{{ formatDate(music.date) }}
							</span>
							<button
								v-if="music.ismv && music.id_youtube_music"
								type="button"
								class="text-cb-primary-900 cursor-pointer text-xs font-medium"
								@click.stop="openMvPreview(music)"
							>
								MV
							</button>
							<span v-if="music.duration" class="text-cb-tertiary-500 text-xs">
								{{ formatDuration(music.duration) }}
							</span>
						</div>
					</div>

					<button
						v-if="music.id_youtube_music"
						type="button"
						class="bg-cb-quaternary-950 hover:bg-cb-primary-900 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
						aria-label="Add to playlist"
						@click.stop="handleQueueMusic(music)"
					>
						<UIcon name="i-heroicons-plus-solid" class="size-4 text-white" />
					</button>
				</div>
			</div>

			<div
				v-if="loading"
				class="text-cb-tertiary-500 flex items-center justify-center gap-2 py-4 text-xs"
			>
				<UIcon name="line-md:loading-twotone-loop" class="size-4 animate-spin" />
				<p>{{ firstLoad ? 'Loading...' : 'Loading...' }}</p>
			</div>

			<div
				v-if="!loading && musicsList.length > 0 && musicsList.length < totalMusics"
				class="flex justify-center gap-2 py-4"
			>
				<UButton color="primary" variant="outline" @click="loadMusics(false)">
					Load more
				</UButton>
				<UButton color="neutral" variant="ghost" @click="loadAllMusics">
					Load all ({{ totalMusics - musicsList.length }} remaining)
				</UButton>
			</div>

			<p
				v-if="!loading && musicsLoadError"
				class="bg-cb-quaternary-950 w-full rounded p-5 text-center text-sm text-red-300"
			>
				{{ musicsLoadError }}
			</p>

			<p
				v-else-if="!loading && musicsList.length === 0"
				class="bg-cb-quaternary-950 w-full rounded p-5 text-center text-sm"
			>
				No music found
			</p>
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
	import { useDebounceFn } from '@vueuse/core'
	import type { LocationQuery, LocationQueryValue } from 'vue-router'
	import type { Artist, ArtistMenuItem, Music } from '~/types'
	import { useSupabaseMusic } from '~/composables/Supabase/useSupabaseMusic'

	type YearMenuItem = { value: number; label: string }
	type StyleMenuItem = { value: string; label: string }

	const route = useRoute()
	const router = useRouter()
	const scrollContainer = useTemplateRef<HTMLElement>('scrollContainer')
	const currentYear = new Date().getFullYear()

	const { getMusicsByPage } = useSupabaseMusic()
	const { addToPlaylist, playNow, stopMusic } = useYouTube()
	const idYoutubeVideo = useIdYoutubeVideo()
	const isPlayingVideo = useIsPlayingVideo()

	const search = ref('')
	const selectedArtists = ref<string[]>([])
	const selectedArtistsWithLabel = ref<ArtistMenuItem[]>([])
	const selectedYears = ref<number[]>([])
	const selectedYearsWithLabel = ref<YearMenuItem[]>([])
	const selectedStyles = ref<string[]>([])
	const selectedStylesWithLabel = ref<StyleMenuItem[]>([])
	const isMv = ref(false)
	const orderDirection = ref<'asc' | 'desc'>('desc')

	const currentPage = ref(1)
	const totalPages = ref(1)
	const totalMusics = ref(0)
	const limit = 30
	const loading = ref(false)
	const firstLoad = ref(true)
	const isInitialized = ref(false)
	const isApplyingFilterState = ref(false)
	const isReady = ref(false)
	const musicsLoadError = ref<string | null>(null)
	const mvPreview = ref<{ videoId: string; title: string } | null>(null)
	const isMvPreviewOpen = computed({
		get: () => Boolean(mvPreview.value),
		set: (value: boolean) => {
			if (!value) closeMvPreview()
		},
	})

	const artistsList = ref<Artist[]>([])
	const musicsList = ref<(Music & { artists: { name: string }[] })[]>([])

	const hasMore = computed(() => currentPage.value <= totalPages.value)

	const availableYears = Array.from(
		{ length: currentYear - 2020 + 1 },
		(_, index) => 2020 + index,
	)
	const availableStyles = [
		'K-Pop',
		'K-Hiphop',
		'K-R&B',
		'K-Ballad',
		'K-Rap',
		'K-Rock',
		'K-Indie',
		'K-Soul',
		'Korean Trot',
		'J-Pop',
		'J-Hiphop',
		'J-R&B',
		'J-Rock',
		'C-Pop',
		'C-Hiphop',
		'C-Rap',
		'Mando-Pop',
		'Mando-Hiphop',
		'Thai-Pop',
		'Thai-Hiphop',
		'Thai-Rap',
		'Thai-R&B',
		'Pop',
		'R&B',
	]

	const artistsForMenu = computed((): ArtistMenuItem[] => {
		return artistsList.value.map((artist) => ({
			id: artist.id,
			label: artist.name,
			name: artist.name,
			description: artist.description ?? undefined,
			image: artist.image,
		}))
	})

	const yearsForMenu = computed(() => {
		return availableYears.map((year) => ({
			value: year,
			label: year.toString(),
		})) as YearMenuItem[]
	})

	const stylesForMenu = computed(() => {
		return availableStyles.map((style) => ({
			value: style,
			label: style,
		})) as StyleMenuItem[]
	})

	const loadAvailableArtists = async (): Promise<void> => {
		try {
			const result = await $fetch<{ artists: Artist[] }>('/api/musics/filter-artists', {
				params: {
					search: search.value || undefined,
					years: selectedYears.value.length > 0 ? selectedYears.value.join(',') : undefined,
					styles:
						selectedStyles.value.length > 0 ? selectedStyles.value.join(',') : undefined,
					ismv: isMv.value === true ? 'true' : undefined,
					selectedArtistIds:
						selectedArtists.value.length > 0
							? selectedArtists.value.join(',')
							: undefined,
				},
			})

			artistsList.value = result.artists
			syncSelectedLabelsFromValues()
		} catch (error) {
			console.error('Error loading filtered artists:', error)
		}
	}

	const parseQueryList = (value: LocationQueryValue | LocationQueryValue[] | undefined): string[] => {
		if (!value) return []

		const rawValues = Array.isArray(value) ? value : [value]
		return rawValues
			.flatMap((entry) => String(entry).split(','))
			.map((entry) => entry.trim())
			.filter(Boolean)
	}

	const normalizeQuery = (query: LocationQuery): Record<string, string> => {
		return Object.fromEntries(
			Object.entries(query)
				.filter(([, value]) => value !== undefined)
				.map(([key, value]) => {
					const normalizedValue = Array.isArray(value)
						? value.map((entry) => String(entry)).join(',')
						: String(value)
					return [key, normalizedValue]
				}),
		)
	}


	const syncSelectedLabelsFromValues = () => {
		const knownArtists = new Map<string, ArtistMenuItem>()

		for (const artist of artistsList.value) {
			knownArtists.set(artist.id, {
				id: artist.id,
				label: artist.name,
				name: artist.name,
				description: artist.description ?? undefined,
				image: artist.image,
			})
		}

		for (const artist of selectedArtistsWithLabel.value) {
			knownArtists.set(artist.id, artist)
		}

		selectedArtistsWithLabel.value = selectedArtists.value
			.map((artistId) => knownArtists.get(artistId))
			.filter((artist): artist is ArtistMenuItem => Boolean(artist))

		selectedYearsWithLabel.value = selectedYears.value.map((year) => ({
			value: year,
			label: year.toString(),
		}))

		selectedStylesWithLabel.value = selectedStyles.value.map((style) => ({
			value: style,
			label: style,
		}))
	}

	const applyFiltersFromRoute = () => {
		search.value = typeof route.query.search === 'string' ? route.query.search : ''
		selectedArtists.value = parseQueryList(route.query.artists)

		const parsedYears = parseQueryList(route.query.years)
			.map((year) => Number(year))
			.filter((year) => Number.isInteger(year))
		selectedYears.value = parsedYears

		selectedStyles.value = parseQueryList(route.query.styles)
		isMv.value = route.query.ismv === 'true'
		orderDirection.value = route.query.orderDirection === 'asc' ? 'asc' : 'desc'

		syncSelectedLabelsFromValues()
	}

	const buildShareableQuery = (): Record<string, string> => {
		const query: Record<string, string> = {}
		const trimmedSearch = search.value.trim()
		const sortedYears = [...selectedYears.value].sort((a, b) => a - b)

		if (trimmedSearch) {
			query.search = trimmedSearch
		}

		if (selectedArtists.value.length > 0) {
			query.artists = selectedArtists.value.join(',')
		}

		if (sortedYears.length > 0) {
			query.years = sortedYears.join(',')
		}

		if (selectedStyles.value.length > 0) {
			query.styles = selectedStyles.value.join(',')
		}

		if (isMv.value) {
			query.ismv = 'true'
		}

		if (orderDirection.value !== 'desc') {
			query.orderDirection = orderDirection.value
		}

		return query
	}

	const updateUrlFromFilters = async () => {
		const nextQuery = buildShareableQuery()
		if (
			JSON.stringify(normalizeQuery(route.query)) === JSON.stringify(nextQuery)
		) {
			return
		}

		await router.replace({ query: nextQuery })
	}

	const runFilterBatch = async (callback: () => void | Promise<void>) => {
		isApplyingFilterState.value = true
		await callback()
		isApplyingFilterState.value = false

		if (!isReady.value) return
		await updateUrlFromFilters()
		await Promise.all([loadAvailableArtists(), loadMusics(true)])
	}

	const loadMusics = async (isFirstCall = false): Promise<void> => {
		if (loading.value) return
		loading.value = true
		musicsLoadError.value = null

		try {
			if (isFirstCall) {
				currentPage.value = 1
				musicsList.value = []
				firstLoad.value = true
			} else {
				firstLoad.value = false
			}

			const result = await getMusicsByPage(currentPage.value, limit, {
				search: search.value || undefined,
				artistIds: selectedArtists.value.length > 0 ? selectedArtists.value : undefined,
				years: selectedYears.value.length > 0 ? selectedYears.value : undefined,
				styles: selectedStyles.value.length > 0 ? selectedStyles.value : undefined,
				orderBy: 'date',
				orderDirection: orderDirection.value,
				ismv: isMv.value === true ? true : undefined,
			})

			totalMusics.value = result.total
			totalPages.value = result.totalPages

			const newMusics = result.musics.map((music) => ({
				...music,
				artists: music.artists || [],
			}))

			if (isFirstCall) {
				musicsList.value = Array.from(
					new Map(newMusics.map((music) => [music.id, music])).values(),
				)
				currentPage.value = 2
			} else {
				musicsList.value = Array.from(
					new Map(
						[...musicsList.value, ...newMusics].map((music) => [music.id, music]),
					).values(),
				)
				currentPage.value++
			}
		} catch (error) {
			console.error('Error loading music:', error)
			musicsLoadError.value = 'Unable to load music.'
		} finally {
			loading.value = false
		}
	}

	const loadMore = async () => {
		if (loading.value || !hasMore.value || !isInitialized.value) return

		const container = scrollContainer.value
		if (!container) return

		const { scrollTop, scrollHeight, clientHeight } = container
		const distanceFromBottom = scrollHeight - scrollTop - clientHeight

		if (distanceFromBottom > 300) return

		await loadMusics(false)
	}

	const loadAllMusics = async (): Promise<void> => {
		while (hasMore.value && !loading.value) {
			await loadMusics(false)
		}
	}

	onMounted(() => {
		const container = scrollContainer.value
		if (container) {
			container.addEventListener('scroll', loadMore)
		}
	})

	onUnmounted(() => {
		const container = scrollContainer.value
		if (container) {
			container.removeEventListener('scroll', loadMore)
		}
	})

	const formatArtists = (artists: { name: string }[] = []) => {
		return artists.map((artist) => artist.name).join(', ') || 'Unknown artist'
	}

	const formatDuration = (seconds: number): string => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const formatDate = (dateString: string | null | undefined): string => {
		if (!dateString) return ''
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		})
	}

	const getMusicThumbnail = (music: Music): string => {
		if (music.thumbnails && Array.isArray(music.thumbnails)) {
			const thumbs = music.thumbnails as Array<{ url?: string | null }>
			return thumbs[2]?.url || thumbs[0]?.url || ''
		}
		return ''
	}

	const getMusicThumbnailFromList = (music: Music & { artists: { name: string }[] }): string => {
		if (music.thumbnails && Array.isArray(music.thumbnails)) {
			const thumbs = music.thumbnails as Array<{ url?: string | null }>
			return thumbs[2]?.url || thumbs[0]?.url || ''
		}
		return ''
	}

	const handlePlayMusic = (music: Music) => {
		if (!music.id_youtube_music) return

		if (isCurrentlyPlaying(music.id_youtube_music)) {
			stopMusic()
			return
		}

		playNow(
			music.id_youtube_music,
			music.title || music.name || '',
			formatArtists(music.artists || []),
			getMusicThumbnail(music),
			music.ismv === true,
		)
	}

	const handleQueueMusic = (music: Music) => {
		if (!music.id_youtube_music) return
		addToPlaylist(
			music.id_youtube_music,
			music.title || music.name || '',
			formatArtists(music.artists || []),
			getMusicThumbnail(music),
			music.ismv === true,
		)
	}


	const openMvPreview = (music: Music) => {
		if (!music.id_youtube_music) return
		mvPreview.value = {
			videoId: music.id_youtube_music,
			title: music.title || music.name || 'Music Video',
		}
	}

	const closeMvPreview = () => {
		mvPreview.value = null
	}
	const isCurrentlyPlaying = (videoId: string | null | undefined): boolean => {
		if (!videoId) return false
		return isPlayingVideo.value && idYoutubeVideo.value === videoId
	}

	const resetFilters = async () => {
		await runFilterBatch(() => {
			search.value = ''
			selectedArtists.value = []
			selectedArtistsWithLabel.value = []
			selectedYears.value = []
			selectedYearsWithLabel.value = []
			selectedStyles.value = []
			selectedStylesWithLabel.value = []
			isMv.value = false
			orderDirection.value = 'desc'
		})
	}

	const toggleOrderDirection = () => {
		orderDirection.value = orderDirection.value === 'desc' ? 'asc' : 'desc'
	}

	watch(selectedArtistsWithLabel, (newValue: ArtistMenuItem[]) => {
		selectedArtists.value = newValue.map((artist) => artist.id)
	})

	watch(selectedYearsWithLabel, (newValue: YearMenuItem[]) => {
		selectedYears.value = newValue.map((year) => year.value)
	})

	watch(selectedStylesWithLabel, (newValue: StyleMenuItem[]) => {
		selectedStyles.value = newValue.map((style) => style.value)
	})

	watch([selectedArtists, selectedYears, selectedStyles, isMv, orderDirection], async () => {
		if (isApplyingFilterState.value || !isReady.value) return
		await updateUrlFromFilters()
		await Promise.all([loadAvailableArtists(), loadMusics(true)])
	})

	const debouncedSearch = useDebounceFn(async () => {
		await Promise.all([loadAvailableArtists(), loadMusics(true)])
	}, 300)

	watch(search, async () => {
		if (isApplyingFilterState.value || !isReady.value) return
		await updateUrlFromFilters()
		debouncedSearch()
	})

	onMounted(async () => {
		isApplyingFilterState.value = true
		applyFiltersFromRoute()
		isApplyingFilterState.value = false

		await Promise.all([loadAvailableArtists(), loadMusics(true)])
		isInitialized.value = true
		isReady.value = true
		await updateUrlFromFilters()
	})

	useHead({
		title: 'Music Explorer',
		meta: [
			{
				name: 'description',
				content: 'Explore and listen to recent music releases.',
			},
		],
	})
</script>















