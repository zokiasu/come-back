<template>
	<div class="flex h-[calc(100vh-5rem)] overflow-hidden">
		<div ref="scrollContainer" class="scrollBarLight min-w-0 flex-1 overflow-y-auto p-5">
			<div class="mx-auto w-full max-w-[95rem]">
				<div class="mb-4">
					<h1 class="text-xl font-bold">Explore music</h1>
					<p class="text-cb-tertiary-500 text-xs">
						Listen to recent tracks and refine the list with filters.
					</p>
				</div>

				<div class="mb-6 space-y-4">
					<div
						class="bg-cb-quinary-900/70 space-y-4 rounded-xl border border-white/5 p-4"
					>
						<div class="flex flex-col gap-3 lg:flex-row lg:items-center">
							<UInput
								v-model="search"
								placeholder="Search tracks..."
								class="w-full lg:flex-1"
								size="xl"
							/>

							<div class="flex items-center gap-2">
								<UButton
									type="button"
									color="neutral"
									:variant="showAdvancedFilters ? 'solid' : 'outline'"
									class="min-w-[8.5rem] justify-center"
									@click="toggleAdvancedFilters"
								>
									<UIcon name="material-symbols-light:tune-rounded" class="size-4" />
									More filters
								</UButton>
								<UButton
									v-if="activeFilterChips.length > 0"
									type="button"
									color="secondary"
									variant="outline"
									@click="resetFilters"
								>
									Reset
								</UButton>
							</div>
						</div>

						<div class="space-y-2">
							<div class="flex items-center justify-between gap-3">
								<p
									class="text-cb-tertiary-400 text-[11px] font-semibold tracking-[0.18em] uppercase"
								>
									Quick filters
								</p>
								<span class="text-cb-tertiary-500 text-xs">
									{{ musicsList.length }} / {{ totalMusics }} results
								</span>
							</div>

							<div class="flex flex-wrap gap-2">
								<UButton
									v-for="year in yearChips"
									:key="year"
									type="button"
									color="neutral"
									:variant="selectedYears.includes(year) ? 'solid' : 'outline'"
									:class="
										selectedYears.includes(year) ? 'bg-cb-primary-900 text-white' : ''
									"
									size="sm"
									@click="toggleYear(year)"
								>
									{{ year }}
								</UButton>
							</div>
						</div>

						<div
							class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"
						>
							<div class="flex flex-wrap items-center gap-2">
								<UButton
									type="button"
									:color="isMv ? 'primary' : 'neutral'"
									:variant="isMv ? 'solid' : 'outline'"
									size="sm"
									@click="isMv = !isMv"
								>
									<UIcon
										name="material-symbols-light:smart-display-outline-rounded"
										class="size-4"
									/>
									MVs only
								</UButton>

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
							</div>

							<div class="flex flex-wrap items-center gap-2">
								<UButton
									type="button"
									color="neutral"
									variant="outline"
									size="sm"
									class="min-w-[8rem] justify-center"
									@click="toggleAdvancedFilters"
								>
									<UIcon
										name="material-symbols-light:person-search-outline"
										class="size-4"
									/>
									{{ artistsSummary }}
								</UButton>
								<UButton
									type="button"
									color="neutral"
									variant="outline"
									size="sm"
									class="min-w-[8rem] justify-center"
									@click="toggleAdvancedFilters"
								>
									<UIcon
										name="material-symbols-light:category-outline-rounded"
										class="size-4"
									/>
									{{ stylesSummary }}
								</UButton>
							</div>
						</div>

						<div
							v-if="showAdvancedFilters || hasAdvancedFilters"
							class="grid gap-3 border-t border-white/5 pt-4 lg:grid-cols-2"
						>
							<div class="space-y-2">
								<p
									class="text-cb-tertiary-400 text-[11px] font-semibold tracking-[0.18em] uppercase"
								>
									Artists
								</p>
								<ArtistSearchSelect
									v-model="selectedArtistsModel"
									multiple
									:items="artistsForMenu"
									:loading="artistsLoading"
									placeholder="Filter by artist..."
									search-placeholder="Filter by artist..."
									loading-text="Updating artists for the current filters..."
									idle-text="Type at least 2 characters to search available artists."
									empty-text="No artists match your search."
									class="w-full"
								/>
							</div>

							<div class="space-y-2">
								<p
									class="text-cb-tertiary-400 text-[11px] font-semibold tracking-[0.18em] uppercase"
								>
									Styles
								</p>
								<UInputMenu
									v-model="selectedStylesForMenu"
									:items="stylesForMenu"
									by="value"
									multiple
									placeholder="Filter by style..."
									searchable
									searchable-placeholder="Search for a style..."
									class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
									:ui="{
										content: 'bg-cb-quaternary-950',
										item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
									}"
								/>
							</div>
						</div>
					</div>

					<div v-if="activeFilterChips.length > 0" class="flex flex-wrap gap-2">
						<UButton
							v-for="chip in activeFilterChips"
							:key="`${chip.key}-${'value' in chip ? chip.value : chip.label}`"
							type="button"
							color="neutral"
							variant="outline"
							size="xs"
							class="rounded-full"
							@click="removeActiveFilter(chip)"
						>
							{{ chip.label }}
							<UIcon name="i-heroicons-x-mark" class="size-3" />
						</UButton>
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
	const selectedStyles = ref<string[]>([])
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
	const lastSyncedQuery = ref('')
	const lastArtistsRequestKey = ref('')
	const lastMusicsRequestKey = ref('')
	const musicsLoadError = ref<string | null>(null)
	const showAdvancedFilters = ref(false)
	const artistsLoading = ref(false)
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
			label: artist.name.trim(),
			name: artist.name.trim(),
			image: artist.image,
		}))
	})

	const yearChips = computed(() => [...availableYears].reverse())

	const stylesForMenu = computed(() => {
		return availableStyles.map((style) => ({
			value: style,
			label: style,
		})) as StyleMenuItem[]
	})

	const selectedStylesForMenu = computed<StyleMenuItem[]>({
		get: () =>
			selectedStyles.value.map((style) => ({
				value: style,
				label: style,
			})),
		set: (nextStyles) => {
			selectedStyles.value = nextStyles.map((style) => style.value)
		},
	})

	const hasAdvancedFilters = computed(
		() => selectedArtists.value.length > 0 || selectedStyles.value.length > 0,
	)

	const artistsSummary = computed(() => {
		if (selectedArtists.value.length === 0) return 'Artists'
		if (selectedArtists.value.length === 1)
			return selectedArtistsWithLabel.value[0]?.label || '1 artist'
		return `${selectedArtists.value.length} artists`
	})

	const stylesSummary = computed(() => {
		if (selectedStyles.value.length === 0) return 'Styles'
		if (selectedStyles.value.length === 1) return selectedStyles.value[0]
		return `${selectedStyles.value.length} styles`
	})

	const selectedArtistsModel = computed<ArtistMenuItem[]>({
		get: () => selectedArtistsWithLabel.value,
		set: (nextArtists) => {
			selectedArtistsWithLabel.value = nextArtists
			const nextIds = nextArtists.map((artist) => artist.id)
			const currentIds = selectedArtists.value

			if (
				nextIds.length === currentIds.length &&
				nextIds.every((artistId, index) => artistId === currentIds[index])
			) {
				return
			}

			selectedArtists.value = nextIds
		},
	})

	type ActiveFilterChip =
		| { key: 'search'; label: string }
		| { key: 'ismv'; label: string }
		| { key: 'order'; label: string }
		| { key: 'artist'; value: string; label: string }
		| { key: 'year'; value: number; label: string }
		| { key: 'style'; value: string; label: string }

	const activeFilterChips = computed((): ActiveFilterChip[] => {
		const chips: ActiveFilterChip[] = []
		const trimmedSearch = search.value.trim()

		if (trimmedSearch) {
			chips.push({ key: 'search', label: `Search: ${trimmedSearch}` })
		}

		for (const artist of selectedArtistsWithLabel.value) {
			chips.push({ key: 'artist', value: artist.id, label: artist.label })
		}

		for (const year of selectedYears.value) {
			chips.push({ key: 'year', value: year, label: String(year) })
		}

		for (const style of selectedStyles.value) {
			chips.push({ key: 'style', value: style, label: style })
		}

		if (isMv.value) {
			chips.push({ key: 'ismv', label: 'MVs only' })
		}

		if (orderDirection.value === 'asc') {
			chips.push({ key: 'order', label: 'Oldest first' })
		}

		return chips
	})

	const loadAvailableArtists = async (options?: { force?: boolean }): Promise<void> => {
		const requestKey = buildArtistRequestKey()
		if (
			!options?.force &&
			requestKey === lastArtistsRequestKey.value &&
			artistsList.value.length > 0
		) {
			syncSelectedLabelsFromValues()
			return
		}

		artistsLoading.value = true
		try {
			const result = await $fetch<{ artists: Artist[] }>('/api/musics/filter-artists', {
				params: {
					search: search.value || undefined,
					years:
						selectedYears.value.length > 0 ? selectedYears.value.join(',') : undefined,
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
			lastArtistsRequestKey.value = requestKey
			syncSelectedLabelsFromValues()
		} catch (error) {
			console.error('Error loading filtered artists:', error)
		} finally {
			artistsLoading.value = false
		}
	}

	const parseQueryList = (
		value: LocationQueryValue | LocationQueryValue[] | undefined,
	): string[] => {
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

	const stringifyQuery = (query: Record<string, string>) => {
		return JSON.stringify(
			Object.keys(query)
				.sort()
				.reduce(
					(accumulator, key) => {
						const value = query[key]
						if (value !== undefined) {
							accumulator[key] = value
						}
						return accumulator
					},
					{} as Record<string, string>,
				),
		)
	}

	const buildArtistRequestKey = () =>
		stringifyQuery({
			search: search.value.trim(),
			years: [...selectedYears.value].sort((left, right) => left - right).join(','),
			styles: [...selectedStyles.value]
				.sort((left, right) => left.localeCompare(right))
				.join(','),
			ismv: isMv.value ? 'true' : '',
			selectedArtistIds: [...selectedArtists.value]
				.sort((left, right) => left.localeCompare(right))
				.join(','),
		})

	const buildMusicRequestKey = (page: number) =>
		stringifyQuery({
			page: String(page),
			search: search.value.trim(),
			artistIds: [...selectedArtists.value]
				.sort((left, right) => left.localeCompare(right))
				.join(','),
			years: [...selectedYears.value].sort((left, right) => left - right).join(','),
			styles: [...selectedStyles.value]
				.sort((left, right) => left.localeCompare(right))
				.join(','),
			orderDirection: orderDirection.value,
			ismv: isMv.value ? 'true' : '',
		})

	const syncSelectedLabelsFromValues = () => {
		const knownArtists = new Map<string, ArtistMenuItem>()

		for (const artist of artistsList.value) {
			knownArtists.set(artist.id, {
				id: artist.id,
				label: artist.name.trim(),
				name: artist.name.trim(),
				image: artist.image,
			})
		}

		for (const artist of selectedArtistsWithLabel.value) {
			knownArtists.set(artist.id, artist)
		}

		selectedArtistsWithLabel.value = selectedArtists.value
			.map((artistId) => knownArtists.get(artistId))
			.filter((artist): artist is ArtistMenuItem => Boolean(artist))
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
		showAdvancedFilters.value =
			selectedArtists.value.length > 0 || selectedStyles.value.length > 0

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
		const nextQueryString = stringifyQuery(nextQuery)
		if (stringifyQuery(normalizeQuery(route.query)) === nextQueryString) {
			lastSyncedQuery.value = nextQueryString
			return
		}

		lastSyncedQuery.value = nextQueryString
		await router.replace({ query: nextQuery })
	}

	const refreshMusicPage = async (options?: { reloadArtists?: boolean }) => {
		if (options?.reloadArtists === false) {
			await loadMusics(true)
			return
		}

		await Promise.all([loadAvailableArtists(), loadMusics(true)])
	}

	const runFilterBatch = async (
		callback: () => void | Promise<void>,
		options?: { reloadArtists?: boolean },
	) => {
		isApplyingFilterState.value = true
		await callback()
		isApplyingFilterState.value = false

		if (!isReady.value) return
		await updateUrlFromFilters()
		await refreshMusicPage(options)
	}

	const loadMusics = async (
		isFirstCall = false,
		options?: { force?: boolean },
	): Promise<void> => {
		if (loading.value) return

		const requestKey = buildMusicRequestKey(isFirstCall ? 1 : currentPage.value)
		if (
			isFirstCall &&
			!options?.force &&
			requestKey === lastMusicsRequestKey.value &&
			musicsList.value.length > 0
		) {
			return
		}

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
				lastMusicsRequestKey.value = requestKey
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
		return date.toLocaleDateString('sv-SE')
	}

	const getMusicThumbnail = (music: Music): string => {
		if (music.thumbnails && Array.isArray(music.thumbnails)) {
			const thumbs = music.thumbnails as Array<{ url?: string | null }>
			return thumbs[2]?.url || thumbs[0]?.url || ''
		}
		return ''
	}

	const getMusicThumbnailFromList = (
		music: Music & { artists: { name: string }[] },
	): string => {
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
			selectedStyles.value = []
			isMv.value = false
			orderDirection.value = 'desc'
		})
	}

	const setOrderDirection = (direction: 'asc' | 'desc') => {
		orderDirection.value = direction
	}

	const toggleYear = async (year: number) => {
		await runFilterBatch(() => {
			selectedYears.value = selectedYears.value.includes(year)
				? selectedYears.value.filter((selectedYear) => selectedYear !== year)
				: [...selectedYears.value, year].sort((a, b) => b - a)
			syncSelectedLabelsFromValues()
		})
	}

	const toggleAdvancedFilters = () => {
		showAdvancedFilters.value = !showAdvancedFilters.value
	}

	const removeActiveFilter = async (chip: ActiveFilterChip) => {
		await runFilterBatch(
			() => {
				switch (chip.key) {
					case 'search':
						search.value = ''
						break
					case 'artist':
						selectedArtists.value = selectedArtists.value.filter(
							(artistId) => artistId !== chip.value,
						)
						break
					case 'year':
						selectedYears.value = selectedYears.value.filter(
							(year) => year !== chip.value,
						)
						break
					case 'style':
						selectedStyles.value = selectedStyles.value.filter(
							(style) => style !== chip.value,
						)
						break
					case 'ismv':
						isMv.value = false
						break
					case 'order':
						orderDirection.value = 'desc'
						break
				}

				syncSelectedLabelsFromValues()
			},
			{
				reloadArtists: !['artist', 'order'].includes(chip.key),
			},
		)
	}

	watch([selectedYears, selectedStyles, isMv], async () => {
		if (isApplyingFilterState.value || !isReady.value) return
		await updateUrlFromFilters()
		await refreshMusicPage({ reloadArtists: true })
	})

	watch([selectedArtists, orderDirection], async () => {
		if (isApplyingFilterState.value || !isReady.value) return
		await updateUrlFromFilters()
		await refreshMusicPage({ reloadArtists: false })
	})

	const debouncedSearch = useDebounceFn(async () => {
		await refreshMusicPage({ reloadArtists: true })
	}, 300)

	watch(search, async () => {
		if (isApplyingFilterState.value || !isReady.value) return
		await updateUrlFromFilters()
		debouncedSearch()
	})

	watch(
		() => normalizeQuery(route.query),
		async (nextQuery, previousQuery) => {
			if (!isReady.value || isApplyingFilterState.value) return

			const nextQueryString = stringifyQuery(nextQuery)
			if (nextQueryString === lastSyncedQuery.value) return

			const currentFilterQuery = buildShareableQuery()
			if (nextQueryString === stringifyQuery(currentFilterQuery)) {
				lastSyncedQuery.value = nextQueryString
				return
			}

			isApplyingFilterState.value = true
			applyFiltersFromRoute()
			isApplyingFilterState.value = false

			lastSyncedQuery.value = nextQueryString
			const shouldReloadArtists = ['search', 'years', 'styles', 'ismv'].some(
				(key) => nextQuery[key] !== previousQuery?.[key],
			)
			await refreshMusicPage({ reloadArtists: shouldReloadArtists })
		},
	)

	onMounted(async () => {
		isApplyingFilterState.value = true
		applyFiltersFromRoute()
		isApplyingFilterState.value = false
		lastSyncedQuery.value = stringifyQuery(normalizeQuery(route.query))

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
