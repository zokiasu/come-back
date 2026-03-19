<template>
	<div class="container mx-auto space-y-6 p-5">
		<div class="space-y-1 text-center">
			<h1 class="text-2xl font-bold">Artists List</h1>
			<p class="text-cb-tertiary-500 text-sm">
				Discover artists and refine the list with focused filters.
			</p>
		</div>

		<div class="space-y-4">
			<div class="bg-cb-quinary-900/70 space-y-4 rounded-xl border border-white/5 p-4">
				<div class="flex flex-col gap-3 lg:flex-row lg:items-center">
					<UInput
						v-model="search"
						type="text"
						placeholder="Search for an artist..."
						size="xl"
						icon="i-heroicons-magnifying-glass"
						class="w-full lg:flex-1"
					/>

					<div class="flex items-center gap-2">
						<UButton
							type="button"
							color="neutral"
							:variant="shouldShowDetailedFilters ? 'solid' : 'outline'"
							class="min-w-[8.5rem] justify-center"
							@click="toggleFilters"
						>
							<UIcon name="material-symbols-light:tune-rounded" class="size-4" />
							More filters
						</UButton>
						<UButton
							v-if="hasActiveFilters"
							type="button"
							color="secondary"
							variant="outline"
							@click="clearAllFilters"
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
							{{ artists.length }} / {{ totalArtists }} results
						</span>
					</div>

					<div class="flex flex-wrap gap-2">
						<UButton
							v-for="type in artistTypes"
							:key="type"
							type="button"
							:color="selectedType === type ? 'primary' : 'neutral'"
							:variant="selectedType === type ? 'solid' : 'outline'"
							size="sm"
							:disabled="isLoading"
							:class="{ 'text-white': selectedType === type }"
							@click="selectedType = selectedType === type ? null : type"
						>
							{{ type === 'SOLO' ? 'Solo' : 'Group' }}
						</UButton>

						<UButton
							v-for="gender in artistGenders"
							:key="gender"
							type="button"
							:color="selectedGender === gender ? 'primary' : 'neutral'"
							:variant="selectedGender === gender ? 'solid' : 'outline'"
							size="sm"
							:disabled="isLoading"
							:class="{ 'text-white': selectedGender === gender }"
							@click="toggleGender(gender)"
						>
							{{ formatGenderLabel(gender) }}
						</UButton>

						<UButton
							type="button"
							:color="selectedActivity === true ? 'primary' : 'neutral'"
							:variant="selectedActivity === true ? 'solid' : 'outline'"
							size="sm"
							:disabled="isLoading"
							:class="{ 'text-white': selectedActivity === true }"
							@click="toggleActivity(true)"
						>
							Active
						</UButton>
						<UButton
							type="button"
							:color="selectedActivity === false ? 'primary' : 'neutral'"
							:variant="selectedActivity === false ? 'solid' : 'outline'"
							size="sm"
							:disabled="isLoading"
							:class="{ 'text-white': selectedActivity === false }"
							@click="toggleActivity(false)"
						>
							Inactive
						</UButton>
					</div>
				</div>

				<div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
					<div class="text-cb-tertiary-500 text-xs">
						Use the quick filters for common cases, then open the detailed filters for
						nationalities, styles and tags.
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<UButton
							type="button"
							color="neutral"
							variant="outline"
							size="sm"
							class="min-w-[8rem] justify-center"
							@click="toggleFilters"
						>
							<UIcon name="i-heroicons-flag" class="size-4" />
							{{ nationalitiesSummary }}
						</UButton>
						<UButton
							type="button"
							color="neutral"
							variant="outline"
							size="sm"
							class="min-w-[8rem] justify-center"
							@click="toggleFilters"
						>
							<UIcon name="i-heroicons-musical-note" class="size-4" />
							{{ stylesSummary }}
						</UButton>
						<UButton
							type="button"
							color="neutral"
							variant="outline"
							size="sm"
							class="min-w-[8rem] justify-center"
							@click="toggleFilters"
						>
							<UIcon name="i-heroicons-tag" class="size-4" />
							{{ tagsSummary }}
						</UButton>
					</div>
				</div>

				<div
					v-if="shouldShowDetailedFilters"
					class="grid gap-3 border-t border-white/5 pt-4 lg:grid-cols-3"
				>
					<div v-if="nationalitiesList.length > 0" class="space-y-2">
						<p
							class="text-cb-tertiary-400 text-[11px] font-semibold tracking-[0.18em] uppercase"
						>
							Nationalities
						</p>
						<UInputMenu
							v-model="selectedNationalitiesForMenu"
							:items="nationalitiesForMenu"
							by="value"
							multiple
							placeholder="Filter by nationality..."
							searchable
							searchable-placeholder="Search for a nationality..."
							class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
							:ui="{
								content: 'bg-cb-quaternary-950',
								item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
							}"
						/>
					</div>

					<div v-if="stylesList.length > 0" class="space-y-2">
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

					<div v-if="tagsList.length > 0" class="space-y-2">
						<p
							class="text-cb-tertiary-400 text-[11px] font-semibold tracking-[0.18em] uppercase"
						>
							Tags
						</p>
						<UInputMenu
							v-model="selectedTagsForMenu"
							:items="tagsForMenu"
							by="value"
							multiple
							placeholder="Filter by tag..."
							searchable
							searchable-placeholder="Search for a tag..."
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
				:key="`${chip.key}-${chip.label}`"
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

			<div
				v-if="pageError"
				class="bg-red-500/10 text-red-100 flex flex-col gap-3 rounded-xl border border-red-400/20 p-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<div class="space-y-1">
					<p class="font-semibold">Unable to load the artists list</p>
					<p class="text-sm text-red-100/80">{{ pageError }}</p>
				</div>
				<UButton
					type="button"
					color="error"
					variant="soft"
					:loading="isLoading"
					@click="reloadArtists"
				>
					Try again
				</UButton>
			</div>
		</div>

		<transition-group
			tag="div"
			leave-active-class="animate__bounceOut"
			enter-active-class="animate__bounceIn"
			class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3.5 lg:grid-cols-6 xl:grid-cols-8"
		>
			<CardObject
				v-for="artist in artists"
				:key="artist.id"
				is-artist
				:artist-id="artist.id"
				:main-title="artist.name"
				:image="artist.image || ''"
				:release-date="artist.debut_date || ''"
				:release-type="artist.type || ''"
				:object-link="`/artist/${artist.id}`"
				date-always-display
				class="!min-w-full"
			/>
		</transition-group>
		<div ref="loadMoreSentinel" class="h-px w-full" />

		<LoadingIndicator :show="isLoading && firstLoad" message="Loading artists..." />

		<LoadingIndicator :show="isLoading && !firstLoad" message="Loading more artists..." />
		<div
			v-if="!isLoading && !pageError && artists.length === 0"
			class="bg-cb-quinary-900/40 rounded-xl border border-white/5 py-12 text-center"
		>
			<UIcon name="i-heroicons-user-group" class="text-cb-tertiary-500 mx-auto mb-3 size-10" />
			<p class="font-medium">No artists found</p>
			<p class="text-cb-tertiary-500 mt-1 text-sm">
				Try removing a filter or broadening your search.
			</p>
		</div>
		<div v-if="!hasMore && artists.length > 0" class="py-4 text-center text-gray-400">
			All artists are displayed.
		</div>
	</div>
</template>

<script setup lang="ts">
	import { useSupabaseArtist } from '@/composables/Supabase/useSupabaseArtist'
	import { useSupabaseGeneralTags } from '@/composables/Supabase/useSupabaseGeneralTags'
	import { useSupabaseNationalities } from '@/composables/Supabase/useSupabaseNationalities'
	import { useSupabaseMusicStyles } from '@/composables/Supabase/useSupabaseMusicStyles'
	import {
		useDebounceFn,
		useEventListener,
		useIntersectionObserver,
		useMediaQuery,
	} from '@vueuse/core'
	import type {
		Artist,
		ArtistType,
		ArtistGender,
		GeneralTag,
		MusicStyle,
		Nationality,
	} from '~/types'

	type FilterMenuItem = { value: string; label: string }

	const { getArtistsByPage } = useSupabaseArtist()
	const { getAllGeneralTags } = useSupabaseGeneralTags()
	const { getAllNationalities } = useSupabaseNationalities()
	const { getAllMusicStyles } = useSupabaseMusicStyles()
	const toast = useToast()

	const logArtistIndexTrace = (step: string, details?: Record<string, unknown>) => {
		if (!import.meta.dev) return

		if (details) {
			console.warn(`[ArtistIndex] ${step}`, details)
			return
		}

		console.warn(`[ArtistIndex] ${step}`)
	}

	// Enum values for template usage
	const artistTypes: ArtistType[] = ['SOLO', 'GROUP']
	const artistGenders: ArtistGender[] = ['MALE', 'FEMALE', 'MIXTE', 'UNKNOWN']

	const artists = ref<Artist[]>([])
	const search = ref('')
	const page = ref(1)
	const limit = ref(48)
	const totalArtists = ref(0)
	const totalPages = ref(1)
	const isLoading = ref(false)
	const hasMore = ref(true)
	const isInitialized = ref(false)
	const firstLoad = ref(true)
	const hasUserInteractedForPagination = ref(false)
	const loadMoreSentinel = useTemplateRef<HTMLElement>('loadMoreSentinel')
	const pageError = ref<string | null>(null)

	const tagsList = ref<GeneralTag[]>([])
	const selectedTags = ref<string[]>([])
	const nationalitiesList = ref<Nationality[]>([])
	const selectedNationalities = ref<string[]>([])
	const selectedType = ref<ArtistType | null>(null)
	const stylesList = ref<MusicStyle[]>([])
	const selectedStyles = ref<string[]>([])
	const selectedGender = ref<ArtistGender | null>(null)
	const selectedActivity = ref<boolean | null>(true)

	// State for filter expansion
	const filtersExpanded = ref(false)
	const hasManuallyToggledFilters = ref(false)
	const isDesktopViewport = useMediaQuery('(min-width: 1280px)')

	const nationalitiesForMenu = computed((): FilterMenuItem[] =>
		nationalitiesList.value.map((nationality) => ({
			value: nationality.name,
			label: nationality.name,
		})),
	)

	const stylesForMenu = computed((): FilterMenuItem[] =>
		stylesList.value.map((style) => ({
			value: style.name,
			label: style.name,
		})),
	)

	const tagsForMenu = computed((): FilterMenuItem[] =>
		tagsList.value.map((tag) => ({
			value: tag.name,
			label: tag.name,
		})),
	)

	const selectedNationalitiesForMenu = computed<FilterMenuItem[]>({
		get: () =>
			selectedNationalities.value.map((nationality) => ({
				value: nationality,
				label: nationality,
			})),
		set: (nextNationalities) => {
			selectedNationalities.value = nextNationalities.map((nationality) => nationality.value)
		},
	})

	const selectedStylesForMenu = computed<FilterMenuItem[]>({
		get: () =>
			selectedStyles.value.map((style) => ({
				value: style,
				label: style,
			})),
		set: (nextStyles) => {
			selectedStyles.value = nextStyles.map((style) => style.value)
		},
	})

	const selectedTagsForMenu = computed<FilterMenuItem[]>({
		get: () =>
			selectedTags.value.map((tag) => ({
				value: tag,
				label: tag,
			})),
		set: (nextTags) => {
			selectedTags.value = nextTags.map((tag) => tag.value)
		},
	})

	const fetchArtists = async (reset = false): Promise<boolean> => {
		if (isLoading.value || (!hasMore.value && !reset)) return false
		isLoading.value = true
		pageError.value = null

		if (reset) {
			firstLoad.value = true
		} else {
			firstLoad.value = false
		}

		logArtistIndexTrace('fetchArtists started', {
			reset,
			page: page.value,
			limit: limit.value,
			search: search.value,
			selectedTagsCount: selectedTags.value.length,
			selectedNationalitiesCount: selectedNationalities.value.length,
			selectedStylesCount: selectedStyles.value.length,
			selectedType: selectedType.value,
			selectedGender: selectedGender.value,
			selectedActivity: selectedActivity.value,
		})

		try {
			const result = await getArtistsByPage(page.value, limit.value, {
				search: search.value,
				general_tags: selectedTags.value.length > 0 ? selectedTags.value : undefined,
				nationalities:
					selectedNationalities.value.length > 0 ? selectedNationalities.value : undefined,
				type: selectedType.value || undefined,
				styles: selectedStyles.value.length > 0 ? selectedStyles.value : undefined,
				gender: selectedGender.value || undefined,
				isActive: selectedActivity.value !== null ? selectedActivity.value : undefined,
				verified: true,
				skipYoutubeMusicFilter: true,
				orderBy: 'name',
				orderDirection: 'asc',
			})

			const artistsArray = Array.isArray(result.artists) ? result.artists : []
			totalArtists.value = result.total
			totalPages.value = Math.max(result.totalPages || 1, 1)

			if (reset) {
				artists.value = artistsArray
			} else {
				artists.value = [...artists.value, ...artistsArray]
			}

			hasMore.value = page.value < totalPages.value

			logArtistIndexTrace('fetchArtists resolved', {
				reset,
				page: page.value,
				received: artistsArray.length,
				total: result.total,
				totalPages: totalPages.value,
				hasMore: hasMore.value,
			})

			return true
		} catch (error) {
			const description =
				error instanceof Error ? error.message : 'Unknown error while loading artists.'

			pageError.value = description

			console.error('[ArtistIndex] fetchArtists failed', {
				error,
				reset,
				page: page.value,
				search: search.value,
			})

			if (reset) {
				artists.value = []
				totalArtists.value = 0
				totalPages.value = 1
				hasMore.value = false
			}

			return false
		} finally {
			isLoading.value = false
		}
	}

	const resetPagination = () => {
		page.value = 1
		totalPages.value = 1
		hasMore.value = true
	}

	const reloadArtists = async () => {
		resetPagination()
		await fetchArtists(true)
	}

	const debouncedSearchFetch = useDebounceFn(() => {
		fetchArtists(true)
	}, 300)

	watch(search, () => {
		if (!isInitialized.value) return
		resetPagination()
		debouncedSearchFetch()
	})

	watch(
		[
			selectedTags,
			selectedNationalities,
			selectedType,
			selectedStyles,
			selectedGender,
			selectedActivity,
		],
		() => {
			if (!isInitialized.value) return
			resetPagination()
			fetchArtists(true)
		},
	)

	const loadMore = async () => {
		if (isLoading.value || !hasMore.value) return
		page.value++
		const hasLoadedNextPage = await fetchArtists()
		if (!hasLoadedNextPage) {
			page.value = Math.max(page.value - 1, 1)
		}
	}

	const bootstrapFilters = async () => {
		logArtistIndexTrace('bootstrapFilters started')

		const [tagsResult, nationalitiesResult, stylesResult] = await Promise.allSettled([
			getAllGeneralTags(),
			getAllNationalities(),
			getAllMusicStyles(),
		])

		if (tagsResult.status === 'fulfilled') {
			tagsList.value = tagsResult.value
		} else {
			console.error('[ArtistIndex] Failed to load general tags', tagsResult.reason)
		}

		if (nationalitiesResult.status === 'fulfilled') {
			nationalitiesList.value = nationalitiesResult.value
		} else {
			console.error(
				'[ArtistIndex] Failed to load nationalities',
				nationalitiesResult.reason,
			)
		}

		if (stylesResult.status === 'fulfilled') {
			stylesList.value = stylesResult.value
		} else {
			console.error('[ArtistIndex] Failed to load music styles', stylesResult.reason)
		}

		const failedFilterLoads = [
			tagsResult,
			nationalitiesResult,
			stylesResult,
		].filter((result) => result.status === 'rejected').length

		logArtistIndexTrace('bootstrapFilters completed', {
			tagsCount: tagsList.value.length,
			nationalitiesCount: nationalitiesList.value.length,
			stylesCount: stylesList.value.length,
			failedFilterLoads,
		})

		if (failedFilterLoads > 0) {
			toast.add({
				title: 'Filters partially unavailable',
				description: 'The artists list is still available, but some filter options failed to load.',
				color: 'warning',
			})
		}
	}

	onMounted(async () => {
		logArtistIndexTrace('page mounted')

		try {
			await bootstrapFilters()
			await fetchArtists(true)
		} finally {
			isInitialized.value = true
			logArtistIndexTrace('page initialized', {
				artistsLoaded: artists.value.length,
				totalArtists: totalArtists.value,
				hasError: Boolean(pageError.value),
			})
		}
	})

	useIntersectionObserver(loadMoreSentinel, ([entry]) => {
		if (!entry?.isIntersecting) return
		if (!isInitialized.value || isLoading.value || !hasMore.value) return
		if (!hasUserInteractedForPagination.value) return

		loadMore()
	})

	const markUserInteractedForPagination = () => {
		hasUserInteractedForPagination.value = true
	}

	if (import.meta.client) {
		useEventListener(window, 'wheel', markUserInteractedForPagination, { passive: true })
		useEventListener(window, 'touchmove', markUserInteractedForPagination, { passive: true })
	}

	const toggleGender = (gender: ArtistGender) => {
		if (selectedGender.value === gender) {
			selectedGender.value = null
		} else {
			selectedGender.value = gender
		}
	}

	const toggleActivity = (isActive: boolean) => {
		if (selectedActivity.value === isActive) {
			selectedActivity.value = null
		} else {
			selectedActivity.value = isActive
		}
	}

	// Function to clear all filters
	const clearAllFilters = () => {
		selectedTags.value = []
		selectedNationalities.value = []
		selectedType.value = null
		selectedStyles.value = []
		selectedGender.value = null
		selectedActivity.value = null
	}

	const hasDetailedFilters = computed(() => {
		return (
			selectedNationalities.value.length > 0 ||
			selectedStyles.value.length > 0 ||
			selectedTags.value.length > 0
		)
	})

	const shouldShowDetailedFilters = computed(() => {
		if (hasDetailedFilters.value) return true
		if (hasManuallyToggledFilters.value) return filtersExpanded.value
		return isDesktopViewport.value
	})

	const hasActiveFilters = computed(() => {
		return (
			search.value.trim().length > 0 ||
			selectedTags.value.length > 0 ||
			selectedNationalities.value.length > 0 ||
			selectedType.value !== null ||
			selectedStyles.value.length > 0 ||
			selectedGender.value !== null ||
			selectedActivity.value !== null
		)
	})

	const nationalitiesSummary = computed(() => {
		if (selectedNationalities.value.length === 0) return 'Nationalities'
		if (selectedNationalities.value.length === 1) return selectedNationalities.value[0]
		return `${selectedNationalities.value.length} nationalities`
	})

	const stylesSummary = computed(() => {
		if (selectedStyles.value.length === 0) return 'Styles'
		if (selectedStyles.value.length === 1) return selectedStyles.value[0]
		return `${selectedStyles.value.length} styles`
	})

	const tagsSummary = computed(() => {
		if (selectedTags.value.length === 0) return 'Tags'
		if (selectedTags.value.length === 1) return selectedTags.value[0]
		return `${selectedTags.value.length} tags`
	})

	type ActiveFilterChip =
		| { key: 'search'; label: string }
		| { key: 'type'; label: string }
		| { key: 'gender'; label: string }
		| { key: 'activity'; value: boolean; label: string }
		| { key: 'nationality'; value: string; label: string }
		| { key: 'style'; value: string; label: string }
		| { key: 'tag'; value: string; label: string }

	const activeFilterChips = computed((): ActiveFilterChip[] => {
		const chips: ActiveFilterChip[] = []
		const trimmedSearch = search.value.trim()

		if (trimmedSearch) {
			chips.push({ key: 'search', label: `Search: ${trimmedSearch}` })
		}

		if (selectedType.value) {
			chips.push({
				key: 'type',
				label: selectedType.value === 'SOLO' ? 'Solo' : 'Group',
			})
		}

		if (selectedGender.value) {
			chips.push({
				key: 'gender',
				label: formatGenderLabel(selectedGender.value),
			})
		}

		if (selectedActivity.value !== null) {
			chips.push({
				key: 'activity',
				value: selectedActivity.value,
				label: selectedActivity.value ? 'Active' : 'Inactive',
			})
		}

		for (const nationality of selectedNationalities.value) {
			chips.push({ key: 'nationality', value: nationality, label: nationality })
		}

		for (const style of selectedStyles.value) {
			chips.push({ key: 'style', value: style, label: style })
		}

		for (const tag of selectedTags.value) {
			chips.push({ key: 'tag', value: tag, label: tag })
		}

		return chips
	})

	const removeActiveFilter = (chip: ActiveFilterChip) => {
		switch (chip.key) {
			case 'search':
				search.value = ''
				break
			case 'type':
				selectedType.value = null
				break
			case 'gender':
				selectedGender.value = null
				break
			case 'activity':
				selectedActivity.value = null
				break
			case 'nationality':
				selectedNationalities.value = selectedNationalities.value.filter(
					(nationality) => nationality !== chip.value,
				)
				break
			case 'style':
				selectedStyles.value = selectedStyles.value.filter((style) => style !== chip.value)
				break
			case 'tag':
				selectedTags.value = selectedTags.value.filter((tag) => tag !== chip.value)
				break
		}
	}

	const formatGenderLabel = (gender: string) => {
		const labels: Record<string, string> = {
			MALE: 'Male',
			FEMALE: 'Female',
			MIXTE: 'Mixed',
			UNKNOWN: 'Unknown',
		}
		return labels[gender] || gender
	}

	const toggleFilters = () => {
		hasManuallyToggledFilters.value = true
		filtersExpanded.value = !shouldShowDetailedFilters.value
	}
</script>
