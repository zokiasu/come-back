<script setup lang="ts">
	import { useDebounce } from '~/composables/useDebounce'
	import { useSupabaseCompanies } from '~/composables/Supabase/useSupabaseCompanies'
	import type { Company } from '~/types'
	import { useInfiniteScroll } from '@vueuse/core'

	// Types
	interface FilterState {
		onlyUnverified: boolean
		onlyWithoutWebsite: boolean
		onlyWithoutLogo: boolean
		onlyWithoutDescription: boolean
	}

	// État
	const toast = useToast()
	const { getAllCompanies, deleteCompany, getCompaniesStats, companyTypes } =
		useSupabaseCompanies()

	const companiesFetch = ref<Company[]>([])
	const search = ref('')
	const invertSort = ref(false)
	const page = ref(1)
	const currentPage = ref(1)
	const totalPages = ref(1)
	const totalCompanies = ref(0)

	const scrollContainer = useTemplateRef('scrollContainer')
	const sort = ref<keyof Company>('name')
	const limitFetch = ref(48)
	const typeFilter = ref<Company['type'] | ''>('')
	const verifiedFilter = ref<'all' | 'verified' | 'unverified'>('all')
	const isLoading = ref(false)

	// Statistiques
	const stats = ref({
		total: 0,
		verified: 0,
		totalRelations: 0,
		activeRelations: 0,
		typeDistribution: {} as Record<string, number>,
	})

	// Filtres
	const filterState = reactive<FilterState>({
		onlyUnverified: false,
		onlyWithoutWebsite: false,
		onlyWithoutLogo: false,
		onlyWithoutDescription: false,
	})

	// Computed
	const observerTarget = useTemplateRef('observerTarget')
	const hasMore = computed(() => currentPage.value <= totalPages.value)

	// État pour le modal de confirmation
	const deleteModal = reactive({
		isOpen: false,
		companyId: '',
		companyName: '',
	})

	// État pour le modal de création/édition
	const editModal = reactive({
		isOpen: false,
		company: null as Company | null,
		isCreating: true,
	})

	// Fonctions
	/**
	 * Charge les statistiques
	 */
	const loadStats = async () => {
		try {
			stats.value = await getCompaniesStats()
		} catch (error) {
			console.error('Erreur lors du chargement des statistiques:', error)
		}
	}

	/**
	 * Ouvre le modal de confirmation de suppression
	 */
	const openDeleteModal = (id: string): void => {
		const company = companiesFetch.value.find((c) => c.id === id)
		if (company) {
			deleteModal.companyId = id
			deleteModal.companyName = company.name
			deleteModal.isOpen = true
		}
	}

	/**
	 * Ferme le modal de confirmation
	 */
	const closeDeleteModal = (): void => {
		deleteModal.isOpen = false
		deleteModal.companyId = ''
		deleteModal.companyName = ''
	}

	/**
	 * Confirme la suppression et met à jour la liste locale
	 */
	const confirmDelete = async (): Promise<void> => {
		try {
			await deleteCompany(deleteModal.companyId)

			// Supprimer la company de la liste locale
			companiesFetch.value = companiesFetch.value.filter(
				(c) => c.id !== deleteModal.companyId,
			)

			// Mettre à jour le compteur total
			totalCompanies.value = Math.max(0, totalCompanies.value - 1)

			// Recharger les statistiques
			await loadStats()

			closeDeleteModal()
		} catch (error) {
			console.error('Erreur lors de la suppression:', error)
		}
	}

	/**
	 * Ouvre le modal de création
	 */
	const openCreateModal = (): void => {
		editModal.company = null
		editModal.isCreating = true
		editModal.isOpen = true
	}

	/**
	 * Ouvre le modal d'édition
	 */
	const openEditModal = (company: Company): void => {
		editModal.company = { ...company }
		editModal.isCreating = false
		editModal.isOpen = true
	}

	/**
	 * Ferme le modal de création/édition
	 */
	const closeEditModal = (): void => {
		editModal.isOpen = false
		editModal.company = null
	}

	/**
	 * Callback après création/modification réussie
	 */
	const onCompanyUpdated = async (): Promise<void> => {
		closeEditModal()
		await getCompanies(true)
		await loadStats()
	}

	/**
	 * Récupère les companies depuis Supabase
	 */
	const getCompanies = async (firstCall = false): Promise<void> => {
		if (isLoading.value) return
		isLoading.value = true

		try {
			if (firstCall) {
				currentPage.value = 1
				companiesFetch.value = []
			}

			const result = await getAllCompanies({
				limit: limitFetch.value,
				offset: firstCall ? 0 : (currentPage.value - 1) * limitFetch.value,
				search: search.value || undefined,
				type: typeFilter.value || undefined,
				verified:
					verifiedFilter.value === 'all'
						? undefined
						: verifiedFilter.value === 'verified',
				orderBy: sort.value,
				orderDirection: invertSort.value ? 'desc' : 'asc',
			})

			totalCompanies.value = result.total
			totalPages.value = result.totalPages

			if (firstCall) {
				companiesFetch.value = result.companies
			} else {
				companiesFetch.value = [...companiesFetch.value, ...result.companies]
			}

			currentPage.value++
		} catch (error) {
			console.error('Erreur lors de la récupération des companies:', error)
			toast.add({
				title: 'Erreur lors du chargement des companies',
				description: 'Une erreur est survenue lors du chargement des companies',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	/**
	 * Change l'état des filtres "only without"
	 */
	const changeOnlyFilter = (filter: keyof FilterState): void => {
		// Réinitialise tous les filtres
		Object.keys(filterState).forEach((key) => {
			filterState[key as keyof FilterState] = false
		})

		// Active uniquement le filtre sélectionné
		filterState[filter] = !filterState[filter]
	}

	/**
	 * Recherche avec debounce
	 */
	const performSearch = useDebounce(async () => {
		await getCompanies(true)
	}, 300)

	/**
	 * Charge toutes les companies restantes
	 */
	const loadAllCompanies = async (): Promise<void> => {
		while (currentPage.value <= totalPages.value && !isLoading.value) {
			await getCompanies(false)
		}
	}

	/**
	 * Trie la liste des companies en fonction des critères
	 */
	const filteredCompaniesList = computed(() => {
		if (!companiesFetch.value) return companiesFetch.value

		return [...companiesFetch.value].sort((a, b) => {
			if (sort.value === 'created_at') {
				return invertSort.value
					? new Date(b.created_at ?? '').getTime() -
							new Date(a.created_at ?? '').getTime()
					: new Date(a.created_at ?? '').getTime() -
							new Date(b.created_at ?? '').getTime()
			}
			if (sort.value === 'updated_at') {
				return invertSort.value
					? new Date(b.updated_at ?? '').getTime() -
							new Date(a.updated_at ?? '').getTime()
					: new Date(a.updated_at ?? '').getTime() -
							new Date(b.updated_at ?? '').getTime()
			}
			if (sort.value === 'type') {
				return invertSort.value
					? (b.type || '').localeCompare(a.type || '')
					: (a.type || '').localeCompare(b.type || '')
			}
			if (sort.value === 'founded_year') {
				return invertSort.value
					? (b.founded_year || 0) - (a.founded_year || 0)
					: (a.founded_year || 0) - (b.founded_year || 0)
			}
			return invertSort.value
				? (b.name || '').localeCompare(a.name || '')
				: (a.name || '').localeCompare(b.name || '')
		})
	})

	const loadMore = async () => {
		if (isLoading.value || currentPage.value > totalPages.value) return
		await getCompanies(false)
	}

	useInfiniteScroll(scrollContainer, loadMore, {
		distance: 200,
		canLoadMore: () => currentPage.value <= totalPages.value && !isLoading.value,
	})

	// Lifecycle hooks
	onMounted(async () => {
		await Promise.all([getCompanies(true), loadStats()])
	})

	// Watchers
	watch(
		[
			limitFetch,
			typeFilter,
			verifiedFilter,
			() => filterState.onlyUnverified,
			() => filterState.onlyWithoutWebsite,
			() => filterState.onlyWithoutLogo,
			() => filterState.onlyWithoutDescription,
			sort,
		],
		async () => {
			try {
				await getCompanies(true)
			} catch (error) {
				console.error('Erreur dans le watcher:', error)
			}
		},
	)

	// Watcher pour la recherche
	watch(search, () => {
		// Reset page to 1 when search changes
		if (page.value !== 1) page.value = 1
		performSearch()
	})

	definePageMeta({
		middleware: ['admin'],
	})
</script>

<template>
	<div
		ref="scrollContainer"
		class="scrollBarLight relative h-full space-y-3 overflow-hidden overflow-y-scroll pr-2"
	>
		<!-- Statistiques en header -->
		<section class="bg-cb-secondary-950 sticky top-0 z-20 w-full space-y-4 pb-4">
			<div class="grid grid-cols-2 gap-2 md:grid-cols-4">
				<div class="bg-cb-quinary-900 rounded p-3 text-center">
					<p class="text-cb-tertiary-200 text-xs uppercase">Total</p>
					<p class="text-lg font-bold">{{ stats.total }}</p>
				</div>
				<div class="bg-cb-quinary-900 rounded p-3 text-center">
					<p class="text-cb-tertiary-200 text-xs uppercase">Verified</p>
					<p class="text-lg font-bold">{{ stats.verified }}</p>
				</div>
				<div class="bg-cb-quinary-900 rounded p-3 text-center">
					<p class="text-cb-tertiary-200 text-xs uppercase">Relations</p>
					<p class="text-lg font-bold">{{ stats.totalRelations }}</p>
				</div>
				<div class="bg-cb-quinary-900 rounded p-3 text-center">
					<p class="text-cb-tertiary-200 text-xs uppercase">Actives</p>
					<p class="text-lg font-bold">{{ stats.activeRelations }}</p>
				</div>
			</div>

			<!-- Barre de recherche et bouton d'ajout -->
			<div class="flex gap-2">
				<div class="relative flex-1">
					<input
						id="search-input"
						v-model="search"
						type="text"
						placeholder="Rechercher des companies..."
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none"
					/>
				</div>
				<button
					class="bg-cb-primary-900 hover:bg-cb-primary-800 rounded px-4 py-2 text-white transition-colors"
					@click="openCreateModal"
				>
					+ Ajouter
				</button>
			</div>

			<!-- Filtres -->
			<div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
				<div class="flex w-fit flex-wrap justify-between gap-2 sm:flex-nowrap">
					<button
						class="w-full rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500 lg:text-nowrap"
						:class="
							filterState.onlyUnverified ? 'bg-cb-primary-900' : 'bg-cb-quinary-900'
						"
						@click="changeOnlyFilter('onlyUnverified')"
					>
						Non vérifiées
					</button>
					<button
						class="w-full rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500 lg:text-nowrap"
						:class="
							filterState.onlyWithoutWebsite ? 'bg-cb-primary-900' : 'bg-cb-quinary-900'
						"
						@click="changeOnlyFilter('onlyWithoutWebsite')"
					>
						Sans site web
					</button>
					<button
						class="w-full rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500 lg:text-nowrap"
						:class="
							filterState.onlyWithoutLogo ? 'bg-cb-primary-900' : 'bg-cb-quinary-900'
						"
						@click="changeOnlyFilter('onlyWithoutLogo')"
					>
						Sans logo
					</button>
					<button
						class="w-full rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500 lg:text-nowrap"
						:class="
							filterState.onlyWithoutDescription
								? 'bg-cb-primary-900'
								: 'bg-cb-quinary-900'
						"
						@click="changeOnlyFilter('onlyWithoutDescription')"
					>
						Sans description
					</button>
					<select
						v-model="typeFilter"
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 rounded border-none p-2 text-xs uppercase transition-all duration-300 ease-in-out focus:outline-none sm:w-fit"
					>
						<option value="">All types</option>
						<option v-for="type in companyTypes" :key="type" :value="type">
							{{ type }}
						</option>
					</select>
					<select
						v-model="verifiedFilter"
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 rounded border-none p-2 text-xs uppercase transition-all duration-300 ease-in-out focus:outline-none sm:w-fit"
					>
						<option value="all">All</option>
						<option value="verified">Verified</option>
						<option value="unverified">Unverified</option>
					</select>
				</div>
				<div class="flex space-x-2">
					<select
						v-model="sort"
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 hover:bg-cb-tertiary-200 hover:text-cb-quinary-900 w-full rounded border-none p-2 text-xs uppercase drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none sm:w-fit"
					>
						<option value="name">Name</option>
						<option value="type">Type</option>
						<option value="founded_year">Founded year</option>
						<option value="created_at">Creation date</option>
						<option value="updated_at">Last update</option>
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
		</section>

		<!-- Liste des companies -->
		<transition-group
			v-if="filteredCompaniesList.length > 0"
			id="companies-list"
			name="list-complete"
			tag="div"
			class="grid grid-cols-1 items-center justify-center gap-2 transition-all duration-300 ease-in-out md:grid-cols-2 lg:grid-cols-4"
		>
			<CardDashboardCompany
				v-for="company in filteredCompaniesList"
				:id="company.id"
				:key="company.id"
				:name="company.name"
				:description="company.description || ''"
				:type="company.type"
				:website="company.website"
				:founded-year="company.founded_year"
				:country="company.country"
				:city="company.city"
				:logo-url="company.logo_url"
				:verified="company.verified || false"
				:created-at="company.created_at"
				:updated-at="company.updated_at"
				@edit-company="openEditModal"
				@delete-company="openDeleteModal"
			/>
		</transition-group>

		<p
			v-else-if="!isLoading"
			class="bg-cb-quaternary-950 w-full p-5 text-center font-semibold uppercase"
		>
			No company found
		</p>

		<div ref="observerTarget" class="mb-4 h-4 w-full"></div>

		<!-- Pagination info -->
		<div
			v-if="
				filteredCompaniesList.length > 0 &&
				companiesFetch.length != 0 &&
				companiesFetch.length != totalCompanies
			"
			class="flex flex-col items-center space-y-2 text-xs"
		>
			<p>({{ companiesFetch.length }} / {{ totalCompanies }})</p>
			<div v-if="!isLoading" class="flex gap-2">
				<button
					class="bg-cb-quinary-900 mx-auto flex w-full gap-1 rounded px-2 py-1 uppercase hover:bg-zinc-500 md:w-fit"
					@click="loadAllCompanies"
				>
					<p>Charger tout</p>
				</button>
			</div>
			<p
				v-else
				class="bg-cb-quinary-900 mx-auto flex w-full gap-1 rounded px-2 py-1 uppercase hover:bg-zinc-500 md:w-fit"
			>
				Chargement...
			</p>
		</div>

		<!-- Modal de confirmation de suppression -->
		<UModal v-model:open="deleteModal.isOpen">
			<template #content>
				<ModalConfirmDeleteCompany
					:company-id="deleteModal.companyId"
					:company-name="deleteModal.companyName"
					@close="closeDeleteModal"
					@confirm="confirmDelete"
				/>
			</template>
		</UModal>

		<!-- Modal de création/édition -->
		<UModal v-model:open="editModal.isOpen">
			<template #content>
				<ModalCreateEditCompany
					:company="editModal.company"
					:is-creating="editModal.isCreating"
					@close="closeEditModal"
					@updated="onCompanyUpdated"
				/>
			</template>
		</UModal>
	</div>
</template>
