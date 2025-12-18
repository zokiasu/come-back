<template>
	<div class="scrollBarLight container mx-auto min-h-screen space-y-5 p-5">
		<div class="space-y-2">
			<div class="grid grid-cols-2 gap-2">
				<UInput v-model="search" placeholder="Search by music name" class="w-full" />
				<UInputMenu
					v-model="selectedArtistsWithLabel"
					:items="artistsForMenu"
					by="id"
					multiple
					placeholder="Select artists..."
					searchable
					searchable-placeholder="Search an artist..."
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
					placeholder="Select years..."
					searchable
					searchable-placeholder="Search year..."
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
					placeholder="Select styles..."
					searchable
					searchable-placeholder="Search style..."
					class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
					:ui="{
						content: 'bg-cb-quaternary-950',
						item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
					}"
				/>
			</div>

			<div class="flex flex-col justify-between gap-2 lg:flex-row">
				<div class="flex flex-col gap-2 lg:flex-row">
					<UButton color="secondary" variant="outline" @click="resetFilters">
						Reset
					</UButton>
					<UButton color="neutral" variant="outline" @click="toggleOrderDirection">
						<UIcon
							name="material-symbols-light:sort"
							class="size-4"
							:class="orderDirection === 'desc' ? 'rotate-180' : ''"
						/>
						Sort by date:
						{{ orderDirection === 'desc' ? 'Most recent' : 'Oldest' }}
					</UButton>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<UCheckbox v-model="isMv" label="Show only music videos (isMv)" class="" />
				<button
					v-if="selectedArtists.length > 0"
					class="text-xs text-red-400 hover:text-red-300"
					@click="clearArtistSelection"
				>
					Clear artists ({{ selectedArtists.length }})
				</button>
				<button
					v-if="selectedYears.length > 0"
					class="text-xs text-red-400 hover:text-red-300"
					@click="clearYearSelection"
				>
					Clear years ({{ selectedYears.length }})
				</button>
				<button
					v-if="selectedStyles.length > 0"
					class="text-xs text-red-400 hover:text-red-300"
					@click="clearStyleSelection"
				>
					Clear styles ({{ selectedStyles.length }})
				</button>
			</div>
		</div>

		<div class="space-y-2">
			<p class="text-cb-tertiary-500 text-xs">
				Music list for
				{{ selectedYears.length > 0 ? selectedYears.sort().join(', ') : 'all years' }}
				({{ musicsList.length }} / {{ totalMusics }} results)
			</p>

			<section class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
				<MusicDisplay
					v-for="music in musicsList"
					:key="music.id"
					:artists="music.artists"
					:releases="music.releases || []"
					:album-name="music.releases?.[0]?.name"
					:album-id="music.releases?.[0]?.id"
					:music-id="music.id_youtube_music || ''"
					:music-name="music.name"
					:artist-name="formatArtists(music.artists)"
					:music-image="music.thumbnails?.[2]?.url || ''"
					:duration="music.duration || 0"
					:ismv="music.ismv"
					class="bg-cb-quinary-900 w-full"
				/>
			</section>

			<!-- Loading indicator -->
			<div
				v-if="loading"
				class="text-cb-tertiary-500 flex items-center justify-center gap-2 py-4 text-xs"
			>
				<UIcon name="line-md:loading-twotone-loop" class="size-4 animate-spin" />
				<p>{{ firstLoad ? 'Loading...' : 'Loading more...' }}</p>
			</div>

			<!-- Load all button -->
			<div
				v-if="!loading && musicsList.length > 0 && musicsList.length < totalMusics"
				class="flex flex-col items-center space-y-2 text-xs"
			>
				<button
					class="bg-cb-quinary-900 mx-auto flex w-full gap-1 rounded px-4 py-2 uppercase hover:bg-zinc-500 md:w-fit"
					@click="loadAllMusics"
				>
					Load All ({{ totalMusics - musicsList.length }} remaining)
				</button>
			</div>

			<!-- No results -->
			<p
				v-if="!loading && musicsList.length === 0"
				class="bg-cb-quaternary-950 w-full p-5 text-center font-semibold uppercase"
			>
				No music found
			</p>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { useSupabaseMusic } from '~/composables/Supabase/useSupabaseMusic'
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import type { Music, Artist, ArtistMenuItem } from '~/types'
	import { useInfiniteScroll } from '@vueuse/core'

	type YearMenuItem = { value: number; label: string }
	type StyleMenuItem = { value: string; label: string }

	const { getMusicsByPage } = useSupabaseMusic()
	const { getAllArtists } = useSupabaseArtist()

	// State
	const search = ref('')
	const selectedArtists = ref<string[]>([])
	const selectedArtistsWithLabel = ref<ArtistMenuItem[]>([])
	const selectedYears = ref<number[]>([])
	const selectedYearsWithLabel = ref<YearMenuItem[]>([])
	const selectedStyles = ref<string[]>([])
	const selectedStylesWithLabel = ref<StyleMenuItem[]>([])
	const isMv = ref<boolean | undefined>(undefined)
	const orderDirection = ref<'asc' | 'desc'>('desc')

	// Pagination state
	const currentPage = ref(1)
	const totalPages = ref(1)
	const totalMusics = ref(0)
	const limit = 30

	// Loading state
	const loading = ref(false)
	const firstLoad = ref(true)

	// Data
	const artistsList = ref<Artist[]>([])
	const musicsList = ref<(Music & { artists: { name: string }[] })[]>([])

	// Computed pour vérifier s'il y a plus de données à charger
	const hasMore = computed(() => currentPage.value <= totalPages.value)

	// Années prédéfinies de 2020 à 2025
	const availableYears = [2020, 2021, 2022, 2023, 2024, 2025]

	// Styles musicaux prédéfinis
	const availableStyles = [
		'K-Pop',
		'J-Pop',
		'C-Pop',
		'T-Pop',
		'V-Pop',
		'Hip-Hop',
		'R&B',
		'Rock',
		'Pop',
		'Ballad',
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

	/**
	 * Load musics with pagination support
	 */
	const loadMusics = async (isFirstCall = false): Promise<void> => {
		if (loading.value) return
		loading.value = true

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
				ismv: isMv.value !== undefined ? isMv.value : undefined,
			})

			totalMusics.value = result.total
			totalPages.value = result.totalPages

			const newMusics = result.musics.map((m) => ({
				...m,
				artists: m.artists || [],
			}))

			if (isFirstCall) {
				musicsList.value = newMusics
				currentPage.value = 2
			} else {
				musicsList.value = [...musicsList.value, ...newMusics]
				currentPage.value++
			}

			// Après chaque chargement, vérifier si on doit charger plus
			// (si le contenu ne remplit pas la fenêtre et qu'il y a plus de données)
			await nextTick()
			const canLoadMore = currentPage.value <= totalPages.value
			if (canLoadMore && import.meta.client) {
				const docHeight = document.documentElement.scrollHeight
				const windowHeight = window.innerHeight
				if (docHeight <= windowHeight + 100) {
					// Le contenu ne remplit pas la fenêtre, charger plus
					loading.value = false
					await loadMusics(false)
					return
				}
			}
		} catch (error) {
			console.error('Error loading music:', error)
		} finally {
			loading.value = false
		}
	}

	/**
	 * Load more musics (for infinite scroll)
	 */
	const loadMore = async () => {
		if (loading.value || !hasMore.value) return
		await loadMusics(false)
	}

	/**
	 * Load all remaining musics
	 */
	const loadAllMusics = async (): Promise<void> => {
		while (hasMore.value && !loading.value) {
			await loadMusics(false)
		}
	}

	// Setup infinite scroll on window
	useInfiniteScroll(
		import.meta.client ? window : null,
		loadMore,
		{
			distance: 300,
			canLoadMore: () => hasMore.value && !loading.value,
		},
	)

	function formatArtists(artists: { name: string }[] = []) {
		return artists.map((a) => a.name).join(', ')
	}

	function resetFilters() {
		search.value = ''
		selectedArtists.value = []
		selectedArtistsWithLabel.value = []
		selectedYears.value = []
		selectedYearsWithLabel.value = []
		selectedStyles.value = []
		selectedStylesWithLabel.value = []
		isMv.value = undefined
		loadMusics(true)
	}

	function clearArtistSelection() {
		selectedArtists.value = []
		selectedArtistsWithLabel.value = []
	}

	function clearYearSelection() {
		selectedYears.value = []
		selectedYearsWithLabel.value = []
	}

	function clearStyleSelection() {
		selectedStyles.value = []
		selectedStylesWithLabel.value = []
	}

	function toggleOrderDirection() {
		orderDirection.value = orderDirection.value === 'desc' ? 'asc' : 'desc'
		loadMusics(true)
	}

	// Synchroniser selectedArtistsWithLabel avec selectedArtists
	watch(selectedArtistsWithLabel, (newVal: ArtistMenuItem[]) => {
		selectedArtists.value = newVal.map((artist) => artist.id)
	})

	// Synchroniser selectedYearsWithLabel avec selectedYears
	watch(selectedYearsWithLabel, (newVal: YearMenuItem[]) => {
		selectedYears.value = newVal.map((year) => year.value)
	})

	// Synchroniser selectedStylesWithLabel avec selectedStyles
	watch(selectedStylesWithLabel, (newVal: StyleMenuItem[]) => {
		selectedStyles.value = newVal.map((style) => style.value)
	})

	// Watcher pour les filtres - recharger depuis le début
	watch([selectedArtists, selectedYears, selectedStyles], async () => {
		await loadMusics(true)
	})

	// Load data on mount
	onMounted(async () => {
		try {
			// Charger la liste des artistes actifs
			artistsList.value = await getAllArtists({ isActive: true })
		} catch (error) {
			console.error('Error loading artists:', error)
		}
		// Charger les musiques
		await loadMusics(true)
	})

	defineExpose({ orderDirection, toggleOrderDirection })

	definePageMeta({
		middleware: ['auth'],
	})
</script>
