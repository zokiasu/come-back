<script setup lang="ts">
	import type { Release, Artist } from '~/types'
	import type { ReleaseType } from '~/types'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useUserStore } from '~/stores/user'
	import { useInfiniteScroll } from '@vueuse/core'

	const { deleteRelease: deleteReleaseFunction, getReleasesByPage } = useSupabaseRelease()
	const { getAllArtists } = useSupabaseArtist()
	const toast = useToast()
	const userStore = useUserStore()

	const releaseFetch = ref<Release[]>([])
	const search = ref<string>('')
	const sort = ref<keyof Release>('date')
	const invertSort = ref<boolean>(true)
	const isLoading = ref<boolean>(false)
	const currentPage = ref(1)
	const totalPages = ref(1)
	const totalReleases = ref(0)
	const limitFetch = ref<number>(24)
	const firstLoad = ref(true)
	const typeFilter = ref<ReleaseType | ''>('')
	const selectedArtists = ref<string[]>([])
	const selectedArtistsWithLabel = ref<(Artist & { label: string })[]>([])
	const artistsList = ref<Artist[]>([])

	const artistsForMenu = computed(() => {
		return artistsList.value.map((artist) => ({
			...artist,
			label: artist.name,
		}))
	})

	const scrollContainer = useTemplateRef('scrollContainer')
	const hasMore = computed(() => currentPage.value <= totalPages.value)

	/**
	 * Reset la recherche et recharge tous les releases
	 */
	const resetSearch = () => {
		search.value = ''
		getRelease(true)
	}

	/**
	 * Efface la sélection d'artistes
	 */
	const clearArtistSelection = () => {
		selectedArtists.value = []
		selectedArtistsWithLabel.value = []
	}

	/**
	 * Récupère les releases depuis Supabase
	 */
	const getRelease = async (firstCall = false): Promise<void> => {
		if (isLoading.value) return
		isLoading.value = true

		try {
			// Si c'est le premier appel, réinitialiser la page
			if (firstCall) {
				currentPage.value = 1
				releaseFetch.value = []
			}

			// Récupérer les releases pour la page courante
			const result = await getReleasesByPage(currentPage.value, limitFetch.value, {
				search: search.value,
				type: typeFilter.value || undefined,
				orderBy: sort.value,
				orderDirection: invertSort.value ? 'desc' : 'asc',
				artistIds: selectedArtists.value.length > 0 ? selectedArtists.value : undefined,
			})

			// Mettre à jour les données
			totalReleases.value = result.total
			totalPages.value = result.totalPages

			// Ajouter les nouveaux releases à la liste
			if (firstCall) {
				releaseFetch.value = result.releases
			} else {
				releaseFetch.value = [...releaseFetch.value, ...result.releases]
			}

			// Incrémenter la page courante
			currentPage.value++
		} catch (error) {
			console.error('Erreur lors de la récupération des releases:', error)
			toast.add({
				title: 'Erreur lors du chargement des releases',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	const deleteRelease = async (id: string) => {
		try {
			const res = await deleteReleaseFunction(id)
			if (res) {
				toast.add({
					title: 'Release supprimé',
					color: 'success',
				})
				releaseFetch.value = releaseFetch.value.filter((release) => release.id !== id)
			} else {
				console.log('Erreur lors de la suppression du release')
				toast.add({
					title: 'Erreur lors de la suppression du release',
					color: 'error',
				})
			}
		} catch (error) {
			console.error('Erreur lors de la suppression du release:', error)
			toast.add({
				title: 'Erreur lors de la suppression du release',
				color: 'error',
			})
		}
	}

	// Infinite scroll avec VueUse
	useInfiniteScroll(
		scrollContainer,
		async () => {
			// Charger plus de releases si possible et pas en recherche
			if (hasMore.value && !isLoading.value && search.value.length < 2) {
				await getRelease(false)
			}
		},
		{
			distance: 100, // Se déclenche à 100px du bas
			direction: 'bottom',
		},
	)

	// Hooks
	onMounted(async () => {
		try {
			// Charger seulement les artistes actifs
			artistsList.value = await getAllArtists({ isActive: true })
		} catch (error) {
			console.error('Erreur lors du chargement des artistes:', error)
			toast.add({
				title: 'Erreur lors du chargement des artistes',
				color: 'error',
			})
		}
		// Chargement initial des releases
		getRelease(true)
	})

	// Synchroniser selectedArtistsWithLabel avec selectedArtists
	watch(selectedArtistsWithLabel, (newVal) => {
		selectedArtists.value = newVal.map((artist) => artist.id)
	})

	// Watchers pour les filtres
	watch([sort, selectedArtists], async () => {
		await getRelease(true)
	})

	// Watcher pour la recherche - déclenche automatiquement la recherche
	const debouncedSearch = useDebounce(() => {
		getRelease(true)
	}, 300)

	watch(search, () => {
		debouncedSearch()
	})

	const filteredReleaseList = computed(() => {
		// Maintenant que la recherche et le tri se font côté serveur via getReleasesByPage(),
		// on retourne simplement la liste des releases
		return releaseFetch.value || []
	})

	/**
	 * Charge tous les releases
	 */
	const loadAllReleases = async () => {
		try {
			const result = await getReleasesByPage(1, totalReleases.value, {
				search: search.value,
				type: typeFilter.value || undefined,
				orderBy: sort.value,
				orderDirection: invertSort.value ? 'desc' : 'asc',
				artistIds: selectedArtists.value.length > 0 ? selectedArtists.value : undefined,
			})
			releaseFetch.value = result.releases
		} catch (error) {
			console.error('Erreur lors du chargement de tous les releases:', error)
			toast.add({
				title: 'Erreur lors du chargement de tous les releases',
				color: 'error',
			})
		}
	}
</script>

<template>
	<div
		ref="scrollContainer"
		class="scrollBarLight relative h-full space-y-3 overflow-hidden overflow-y-scroll pr-2"
	>
		<section
			id="searchbar"
			class="bg-cb-secondary-950 sticky top-0 z-50 w-full space-y-2 pb-2"
		>
			<div class="relative flex gap-2">
				<UButton
					v-if="userStore?.isAdminStore"
					to="/release/create"
					icon="i-heroicons-plus"
					variant="solid"
					size="sm"
					label="Créer une release"
					title="Créer une release"
					:ui="{
						label: 'hidden lg:flex',
					}"
					class="bg-cb-primary-800 whitespace-nowrap text-white"
				/>
				<div class="relative flex-1">
					<input
						id="search-input"
						v-model="search"
						type="text"
						placeholder="Search"
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none"
					/>
					<button
						v-if="search.length > 0"
						class="absolute top-1/2 right-2 -translate-y-1/2 rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
						title="Effacer la recherche"
						@click="resetSearch"
					>
						✕
					</button>
				</div>
				<div class="flex space-x-2">
					<select
						v-model="sort"
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 hover:bg-cb-tertiary-200 hover:text-cb-quinary-900 w-full rounded border-none p-2 text-xs uppercase drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none sm:w-fit"
					>
						<option value="name">Name</option>
						<option value="type">Type</option>
						<option value="date">Date</option>
						<option value="year">Year</option>
						<option value="artistsId">Artist</option>
						<option value="createdAt">Last Created</option>
					</select>
					<button
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 hover:bg-cb-tertiary-200 hover:text-cb-quinary-900 rounded border-none p-2 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none"
						@click="invertSort = !invertSort"
					>
						<icon-sort v-if="!invertSort" class="text-cb-tertiary-200 h-6 w-6" />
						<icon-sort-reverse v-else class="text-cb-tertiary-200 h-6 w-6" />
					</button>
				</div>
			</div>

			<!-- Sélection d'artistes -->
			<div class="flex w-full flex-col gap-2">
				<label class="text-sm font-medium text-gray-300">
					Filtrer par artistes
					<span v-if="selectedArtists.length > 0" class="text-xs text-gray-400">
						({{ selectedArtists.length }} sélectionné{{
							selectedArtists.length > 1 ? 's' : ''
						}})
					</span>
				</label>
				<UInputMenu
					v-model="selectedArtistsWithLabel"
					:items="artistsForMenu"
					by="id"
					multiple
					placeholder="Sélectionner des artistes..."
					searchable
					searchable-placeholder="Rechercher un artiste..."
					class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent sm:min-w-64"
					:ui="{
						content: 'bg-cb-quaternary-950',
						item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
					}"
				/>
				<button
					v-if="selectedArtists.length > 0"
					class="self-start text-xs text-red-400 hover:text-red-300"
					@click="clearArtistSelection"
				>
					Effacer la sélection
				</button>
			</div>
		</section>

		<div
			v-if="filteredReleaseList && filteredReleaseList.length > 0"
			id="release-list"
			class="grid grid-cols-1 items-center justify-center gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 2xl:gap-2"
		>
			<div
				v-for="release in filteredReleaseList"
				:key="`key_` + release.id_youtube_music"
				class="h-full w-full"
			>
				<LazyCardDashboardRelease
					:id="release.id"
					:image="release.image"
					:name="release.name"
					:description="release.description || ''"
					:type="release.type"
					:id-youtube-music="release.id_youtube_music"
					:artists-name="release.artists?.[0]?.name || ''"
					:artists="release.artists || []"
					:musics="release.musics || []"
					:created-at="release.created_at"
					:date="release.date"
					:need-to-be-verified="!release.verified"
					:year-released="release.year"
					:platform-list="[]"
					@delete-release="deleteRelease"
				/>
			</div>
		</div>

		<p
			v-else-if="!isLoading && !firstLoad"
			class="bg-cb-quaternary-950 w-full p-5 text-center font-semibold uppercase"
		>
			Aucun release trouvé
		</p>

		<!-- Indicateurs de chargement -->
		<LoadingIndicator
			:show="isLoading && firstLoad"
			message="Chargement des releases..."
		/>

		<LoadingIndicator
			:show="isLoading && !firstLoad"
			message="Chargement de plus de releases..."
		/>
	</div>
</template>
