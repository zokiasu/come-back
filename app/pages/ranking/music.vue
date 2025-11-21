<template>
	<div class="container mx-auto space-y-5 p-5">
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
				<UButton class="cb_button h-full col-span-full" @click="loadMusicsByYear">Search</UButton>
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
				<div v-if="musicData.total > 0" class="flex justify-center">
					<UPagination
						v-model:page="currentPage"
						:total="musicData.total"
						:items-per-page="musicData.limit"
						:disabled="loading"
						@update:page="loadMusicsByYear"
					/>
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
			<div v-if="loading" class="text-cb-tertiary-500 flex items-center gap-2 text-xs">
				<UIcon name="line-md:loading-twotone-loop" class="size-4 animate-spin" />
				<p>Loading...</p>
			</div>
			<p v-else class="text-cb-tertiary-500 text-xs">
				Music list for
				{{ selectedYears.length > 0 ? selectedYears.sort().join(', ') : 'all years' }}
				({{ musicData.total }} results)
			</p>

			<section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
				<MusicDisplay
					v-for="music in musicData.musics"
					:key="music.id"
					:artists="music.artists"
					:releases="music.releases"
					:album-name="music.releases[0]?.name"
					:album-id="music.releases[0]?.id"
					:music-id="music.id_youtube_music"
					:music-name="music.name"
					:artist-name="formatArtists(music.artists)"
					:music-image="music.thumbnails?.[2]?.url || ''"
					:duration="music.duration || 0"
					:ismv="music.ismv"
					class="bg-cb-quinary-900 w-full"
				/>
			</section>

			<div
				v-if="loading && musicData.musics.length > 0"
				class="text-cb-tertiary-500 flex items-center gap-2 text-xs"
			>
				<UIcon name="line-md:loading-twotone-loop" class="size-4 animate-spin" />
				<p>Loading...</p>
			</div>
			<p v-else class="text-cb-tertiary-500 text-xs">
				Music list for
				{{ selectedYears.length > 0 ? selectedYears.sort().join(', ') : 'all years' }}
				({{ musicData.total }} results)
			</p>
			<!-- <div v-for="music in musicData.musics" :key="music.id" class="mb-4 p-4 border rounded">
				<h3>{{ music.name }}</h3>
				<p>Artistes: {{ formatArtists(music.artists) }}</p>
				<p>Type: {{ music.type }}</p>
			</div> -->
		</div>
		<!-- Pagination -->
		<div v-if="musicData.total > 0" class="flex justify-center">
			<UPagination
				v-model:page="currentPage"
				:total="musicData.total"
				:items-per-page="musicData.limit"
				:disabled="loading"
				@update:page="loadMusicsByYear"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { useSupabaseMusic } from '~/composables/Supabase/useSupabaseMusic'
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import type { Music, Artist } from '~/types'
	import { onMounted } from 'vue'

	type MusicWithArtists = Music & { artists: { name: string }[] }
	type ArtistMenuItem = Artist & { label: string }
	type YearMenuItem = { value: number; label: string }
	type StyleMenuItem = { value: string; label: string }

	const { getMusicsByPage } = useSupabaseMusic()
	const { getAllArtists } = useSupabaseArtist()

	const search = ref('')
	const selectedArtists = ref<string[]>([])
	const selectedArtistsWithLabel = ref<ArtistMenuItem[]>([])
	const selectedYears = ref<number[]>([])
	const selectedYearsWithLabel = ref<YearMenuItem[]>([])
	const selectedStyles = ref<string[]>([])
	const selectedStylesWithLabel = ref<StyleMenuItem[]>([])
	const isMv = ref<boolean | undefined>(undefined)
	const currentPage = ref(1)
	const loading = ref(false)
	const artistsList = ref<Artist[]>([])
	const musicData = ref<any>({
		musics: [],
		total: 0,
		page: 1,
		limit: 30,
		totalPages: 0,
	})
	const orderDirection = ref<'asc' | 'desc'>('desc')

	// Années prédéfinies de 2020 à 2025
	const availableYears = [2020, 2021, 2022, 2023, 2024, 2025]

	// Styles musicaux prédéfinis
	const availableStyles = ['K-Pop', 'J-Pop', 'C-Pop', 'T-Pop', 'V-Pop', 'Hip-Hop', 'R&B', 'Rock', 'Pop', 'Ballad']

	const artistsForMenu = computed(() => {
		return artistsList.value.map((artist) => ({
			...artist,
			label: artist.name,
		})) as ArtistMenuItem[]
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

	const loadMusicsByYear = async () => {
		loading.value = true
		try {
			const result = await getMusicsByPage(currentPage.value, musicData.value.limit, {
				search: search.value || undefined,
				artistIds: selectedArtists.value.length > 0 ? selectedArtists.value : undefined,
				years: selectedYears.value.length > 0 ? selectedYears.value : undefined,
				styles: selectedStyles.value.length > 0 ? selectedStyles.value : undefined,
				orderBy: 'date',
				orderDirection: orderDirection.value,
				ismv: isMv.value !== undefined ? isMv.value : undefined,
			})
			console.log('result', result)
			musicData.value = {
				...result,
				musics: result.musics.map((m) => ({
					...m,
					artists: m.artists || [],
				})),
			}
		} catch (error) {
			console.error('Error loading music:', error)
		} finally {
			loading.value = false
		}
	}

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
		currentPage.value = 1
		loadMusicsByYear()
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
		loadMusicsByYear()
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

	// Watcher pour les filtres d'artistes
	watch(selectedArtists, async () => {
		currentPage.value = 1
		await loadMusicsByYear()
	})

	// Watcher pour les filtres d'années
	watch(selectedYears, async () => {
		currentPage.value = 1
		await loadMusicsByYear()
	})

	// Watcher pour les filtres de styles
	watch(selectedStyles, async () => {
		currentPage.value = 1
		await loadMusicsByYear()
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
		currentPage.value = 1
		loadMusicsByYear()
	})

	defineExpose({ orderDirection, toggleOrderDirection })

	definePageMeta({
		middleware: ['auth'],
	})
</script>
