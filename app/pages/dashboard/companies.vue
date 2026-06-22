<script setup lang="ts">
	import { useDebounce } from '~/composables/useDebounce'
	import { useSupabaseCompanies } from '~/composables/Supabase/useSupabaseCompanies'
	import type { Company } from '~/types'
	import { useInfiniteScroll } from '@vueuse/core'

	interface FilterState {
		onlyUnverified: boolean
		onlyWithoutWebsite: boolean
		onlyWithoutLogo: boolean
		onlyWithoutDescription: boolean
	}

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
	const typeFilter = ref<NonNullable<Company['type']> | ''>('')
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

	const filterState = reactive<FilterState>({
		onlyUnverified: false,
		onlyWithoutWebsite: false,
		onlyWithoutLogo: false,
		onlyWithoutDescription: false,
	})

	const observerTarget = useTemplateRef('observerTarget')

	const deleteModal = reactive({
		isOpen: false,
		companyId: '',
		companyName: '',
	})

	const editModal = reactive({
		isOpen: false,
		company: null as Company | null,
		isCreating: true,
	})

	const companyTypeOptions = computed(() => [
		{ label: 'All types', id: '' },
		...companyTypes.map((type) => ({ label: type, id: type })),
	])

	const verifiedOptions = [
		{ label: 'All statuses', id: 'all' },
		{ label: 'Verified', id: 'verified' },
		{ label: 'Unverified', id: 'unverified' },
	]

	const sortOptions = [
		{ label: 'Name', id: 'name' },
		{ label: 'Type', id: 'type' },
		{ label: 'Founded year', id: 'founded_year' },
		{ label: 'Creation date', id: 'created_at' },
		{ label: 'Last update', id: 'updated_at' },
	]

	const quickFilterOptions: {
		label: string
		id: keyof FilterState
	}[] = [
		{ label: 'Unverified', id: 'onlyUnverified' },
		{ label: 'No website', id: 'onlyWithoutWebsite' },
		{ label: 'No logo', id: 'onlyWithoutLogo' },
		{ label: 'No description', id: 'onlyWithoutDescription' },
	]

	/**
	 * Load the statistics
	 */
	const loadStats = async () => {
		try {
			stats.value = await getCompaniesStats()
		} catch (error) {
			console.error('Error while loading statistics:', error)
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
	 * Confirm deletion and update the local list
	 */
	const confirmDelete = async (): Promise<void> => {
		try {
			await deleteCompany(deleteModal.companyId)

			// Remove the company from the local list
			companiesFetch.value = companiesFetch.value.filter(
				(c) => c.id !== deleteModal.companyId,
			)

			// Update the total counter
			totalCompanies.value = Math.max(0, totalCompanies.value - 1)

			// Recharger the statistiques
			await loadStats()

			closeDeleteModal()
		} catch (error) {
			console.error('Error while deleting:', error)
		}
	}

	/**
	 * Open the creation modal
	 */
	const openCreateModal = (): void => {
		editModal.company = null
		editModal.isCreating = true
		editModal.isOpen = true
	}

	/**
	 * Open the edit modal
	 */
	const openEditModal = (company: Company): void => {
		editModal.company = { ...company }
		editModal.isCreating = false
		editModal.isOpen = true
	}

	/**
	 * Close the create/edit modal
	 */
	const closeEditModal = (): void => {
		editModal.isOpen = false
		editModal.company = null
	}

	/**
	 * Callback after a successful create or update
	 */
	const onCompanyUpdated = async (): Promise<void> => {
		closeEditModal()
		await getCompanies(true)
		await loadStats()
	}

	/**
	 * Fetch companies from Supabase
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
			console.error('Error while fetching companies:', error)
			toast.add({
				title: 'Error while loading companies',
				description: 'An error occurred while loading companies',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	/**
	 * Toggle the "only without" filters
	 */
	const changeOnlyFilter = (filter: keyof FilterState): void => {
		const wasActive = filterState[filter]

		Object.keys(filterState).forEach((key) => {
			filterState[key as keyof FilterState] = false
		})

		filterState[filter] = !wasActive
	}

	/**
	 * Debounced search
	 */
	const performSearch = useDebounce(async () => {
		await getCompanies(true)
	}, 300)

	/**
	 * Load all remaining companies
	 */
	const loadAllCompanies = async (): Promise<void> => {
		while (currentPage.value <= totalPages.value && !isLoading.value) {
			await getCompanies(false)
		}
	}

	/**
	 * Sort the companies list based on the selected criteria
	 */
	const filteredCompaniesList = computed(() => {
		if (!companiesFetch.value) return companiesFetch.value

		let companies = [...companiesFetch.value]

		if (filterState.onlyUnverified) {
			companies = companies.filter((company) => !company.verified)
		}
		if (filterState.onlyWithoutWebsite) {
			companies = companies.filter((company) => !company.website)
		}
		if (filterState.onlyWithoutLogo) {
			companies = companies.filter((company) => !company.logo_url)
		}
		if (filterState.onlyWithoutDescription) {
			companies = companies.filter((company) => !company.description)
		}

		return companies.sort((a, b) => {
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
				console.error('Error in watcher:', error)
			}
		},
	)

	// Watcher for search input
	watch(search, () => {
		// Reset page to 1 when search changes
		if (page.value !== 1) page.value = 1
		performSearch()
	})

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
		ssr: false, // Dashboard admin in SPA
	})
</script>

<template>
	<div
		ref="scrollContainer"
		class="scrollBarLight relative h-full space-y-3 overflow-hidden overflow-y-scroll p-6"
	>
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

			<div class="flex gap-2">
				<UInput
					v-model="search"
					name="dashboard-company-search"
					placeholder="Search companies..."
					icon="i-lucide-search"
					class="flex-1"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>
				<UButton
					type="button"
					icon="i-lucide-plus"
					color="primary"
					@click="openCreateModal"
				>
					Add
				</UButton>
			</div>

			<div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
				<div class="flex w-fit flex-wrap justify-between gap-2 sm:flex-nowrap">
					<UButton
						v-for="filter in quickFilterOptions"
						:key="filter.id"
						type="button"
						size="sm"
						:color="filterState[filter.id] ? 'primary' : 'neutral'"
						:variant="filterState[filter.id] ? 'solid' : 'soft'"
						:aria-pressed="filterState[filter.id]"
						class="lg:text-nowrap"
						@click="changeOnlyFilter(filter.id)"
					>
						{{ filter.label }}
					</UButton>
					<USelectMenu
						v-model="typeFilter"
						:items="companyTypeOptions"
						value-key="id"
						class="w-full sm:w-40"
						:ui="{ base: 'bg-cb-quinary-900' }"
					/>
					<USelectMenu
						v-model="verifiedFilter"
						:items="verifiedOptions"
						value-key="id"
						class="w-full sm:w-40"
						:ui="{ base: 'bg-cb-quinary-900' }"
					/>
				</div>
				<div class="flex space-x-2">
					<USelectMenu
						v-model="sort"
						:items="sortOptions"
						value-key="id"
						class="w-full sm:w-44"
						:ui="{ base: 'bg-cb-quinary-900' }"
					/>
					<UButton
						type="button"
						:icon="
							invertSort
								? 'i-lucide-arrow-down-wide-narrow'
								: 'i-lucide-arrow-up-narrow-wide'
						"
						color="neutral"
						variant="soft"
						aria-label="Toggle sort direction"
						@click="invertSort = !invertSort"
					/>
				</div>
			</div>
		</section>

		<transition-group
			v-if="filteredCompaniesList.length > 0"
			id="companies-list"
			name="list-complete"
			tag="div"
			class="grid grid-cols-1 items-center justify-center gap-2 transition-opacity duration-300 ease-in-out md:grid-cols-2 lg:grid-cols-4"
		>
			<CardDashboardCompany
				v-for="company in filteredCompaniesList"
				:id="company.id"
				:key="company.id"
				:name="company.name"
				:description="company.description || ''"
				:type="company.type ?? ''"
				:website="company.website ?? ''"
				:founded-year="company.founded_year ?? 0"
				:country="company.country ?? ''"
				:city="company.city ?? ''"
				:logo-url="company.logo_url ?? ''"
				:verified="company.verified || false"
				:created-at="company.created_at ?? ''"
				:updated-at="company.updated_at ?? ''"
				@edit-company="openEditModal"
				@delete-company="openDeleteModal"
			/>
		</transition-group>

		<DashboardEmptyState
			v-else-if="!isLoading"
			icon="i-lucide-building-2"
			title="No company found"
			description="Try adjusting the search or filters."
		/>

		<div ref="observerTarget" class="mb-4 h-4 w-full"></div>

		<DashboardLoadMoreFooter
			:loaded="companiesFetch.length"
			:total="totalCompanies"
			:loading="isLoading"
			@load-all="loadAllCompanies"
		/>

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
