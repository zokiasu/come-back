<script setup lang="ts">
	import type { Release } from '~/types'
	import type { ReleaseType } from '~/types'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'
	import { useSupabaseSearch } from '~/composables/useSupabaseSearch'
	import { useUserStore } from '~/stores/user'

	const { deleteRelease: deleteReleaseFunction, getReleasesByPage } = useSupabaseRelease()
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

	// Supabase Search
	const { searchArtistsFullText } = useSupabaseSearch()
	const searchResults = ref<Release[]>([])
	const isSearching = ref(false)

	const needToBeVerifiedFilter = ref<boolean>(false)
	const noNeedToBeVerifiedFilter = ref<boolean>(false)

	const observerTarget = useTemplateRef('observerTarget')
	const hasMore = computed(() => currentPage.value <= totalPages.value)

	/**
	 * Effectue une recherche avec Supabase
	 */
	const performSupabaseSearch = useDebounce(async () => {
		if (search.value.length < 2) {
			searchResults.value = []
			return
		}

		isSearching.value = true
		try {
			// Note: Nous utilisons searchArtistsFullText pour les releases aussi
			// Dans un vrai projet, vous pourriez avoir une fonction searchReleasesFullText
			const result = await searchArtistsFullText({
				query: search.value,
				limit: 50
			})
			// Pour les releases, nous devrons adapter cette logique selon vos besoins
			searchResults.value = []
		} catch (error) {
			console.error('Erreur lors de la recherche:', error)
			toast.add({
				title: 'Erreur lors de la recherche',
				color: 'error',
			})
		} finally {
			isSearching.value = false
		}
	}, 300)

	/**
	 * Méthode de recherche unifiée (Supabase uniquement)
	 */
	const triggerSearch = () => {
		if (search.value.length >= 2) {
			performSupabaseSearch()
		} else {
			resetSearch()
		}
	}

	/**
	 * Reset la recherche et recharge tous les releases
	 */
	const resetSearch = () => {
		search.value = ''
		searchResults.value = []
		getRelease(true)
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
				verified: needToBeVerifiedFilter.value
					? false
					: noNeedToBeVerifiedFilter.value
						? true
						: undefined,
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

	// Hooks
	onMounted(() => {
		// Configuration de l'observateur d'intersection pour le chargement infini (client-only)
		if (import.meta.client) {
			const observer = new IntersectionObserver(
				async ([entry]) => {
					if (
						entry.isIntersecting &&
						hasMore.value &&
						!isLoading.value &&
						!useAlgoliaForSearch.value
					) {
						await getRelease()
					}
				},
				{
					rootMargin: '200px',
					threshold: 0.1,
				},
			)

			if (observerTarget.value) {
				observer.observe(observerTarget.value)
			}

			watch(observerTarget, (el) => {
				if (el) {
					observer.observe(el)
				}
			})

			onBeforeUnmount(() => {
				if (observerTarget.value) {
					observer.unobserve(observerTarget.value)
				}
				observer.disconnect()
			})
		}

		// Chargement initial des releases
		getRelease(true)
	})

	// Watchers pour les filtres
	watch([needToBeVerifiedFilter, noNeedToBeVerifiedFilter, sort], async () => {
		await getRelease(true)
	})

	// Watcher pour la recherche
	watch(search, () => {
		if (search.value.length >= 2) {
			performSupabaseSearch()
		} else if (search.value.length === 0) {
			searchResults.value = []
			getRelease(true)
		}
	})

	const filteredReleaseList = computed(() => {
		// Si une recherche est active, retourner les résultats de recherche
		if (search.value.length >= 2) {
			return searchResults.value
		}

		if (!releaseFetch.value) return []

		return [...releaseFetch.value].sort((a, b) => {
			if (sort.value === 'created_at') {
				return invertSort.value
					? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
					: new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			}
			if (sort.value === 'date') {
				return invertSort.value
					? new Date(b.date).getTime() - new Date(a.date).getTime()
					: new Date(a.date).getTime() - new Date(b.date).getTime()
			}
			if (sort.value === 'type') {
				return invertSort.value
					? (b.type || '').localeCompare(a.type || '')
					: (a.type || '').localeCompare(b.type || '')
			}
			if (sort.value === 'name') {
				return invertSort.value
					? (b.name || '').localeCompare(a.name || '')
					: (a.name || '').localeCompare(b.name || '')
			}
			if (sort.value === 'year') {
				return invertSort.value
					? (b.year || 0) - (a.year || 0)
					: (a.year || 0) - (b.year || 0)
			}
			return 0
		})
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
				verified: needToBeVerifiedFilter.value
					? false
					: noNeedToBeVerifiedFilter.value
						? true
						: undefined,
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
						class="bg-red-500 hover:bg-red-600 text-white absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 py-1 text-xs"
						title="Effacer la recherche"
						@click="resetSearch"
					>
						✕
					</button>
				</div>
				<button
					class="bg-cb-tertiary-200 text-cb-quinary-900 hover:bg-cb-tertiary-300 rounded px-3 py-2 text-xs transition-all duration-300"
					title="Recherche Supabase"
					@click="triggerSearch"
				>
					Supabase
				</button>
			</div>
			<section class="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
				<div class="flex space-x-2">
					<UButton
						v-if="userStore?.isAdminStore"
						to="/release/create"
						icon="i-heroicons-plus"
						variant="solid"
						size="sm"
						class="bg-cb-primary-800 whitespace-nowrap text-white"
					>
						Créer une release
					</UButton>
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
					<button
						class="w-full rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500 sm:w-fit"
						:class="needToBeVerifiedFilter ? 'bg-cb-primary-900' : 'bg-cb-quinary-900'"
						@click="needToBeVerifiedFilter = !needToBeVerifiedFilter"
					>
						Only NTBV
					</button>
					<button
						class="w-full rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500 sm:w-fit"
						:class="noNeedToBeVerifiedFilter ? 'bg-cb-primary-900' : 'bg-cb-quinary-900'"
						@click="noNeedToBeVerifiedFilter = !noNeedToBeVerifiedFilter"
					>
						Only NNTBV
					</button>
				</div>
			</section>
		</section>

		<div v-if="isSearching" class="flex justify-center">
			<p class="bg-cb-quinary-900 rounded px-4 py-2 text-center">Recherche en cours...</p>
		</div>

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
			v-else-if="!isSearching"
			class="bg-cb-quaternary-950 w-full p-5 text-center font-semibold uppercase"
		>
			Aucun release trouvé
		</p>

		<div v-if="isLoading && !firstLoad" class="flex justify-center py-4">
			<p>Chargement des releases suivantes...</p>
		</div>

		<div v-if="hasMore && search.length < 2" ref="observerTarget" />
	</div>
</template>

<style scoped>
	.loading-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.loading-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: #666;
		animation: pulse 1.5s infinite ease-in-out;
	}

	.loading-dot:nth-child(2) {
		animation-delay: 0.3s;
	}

	.loading-dot:nth-child(3) {
		animation-delay: 0.6s;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(0.8);
			opacity: 0.5;
		}
		50% {
			transform: scale(1.2);
			opacity: 1;
		}
	}

	.fade-enter-active,
	.fade-leave-active {
		transition: opacity 0.3s;
	}
	.fade-enter-from,
	.fade-leave-to {
		opacity: 0;
	}
</style>
