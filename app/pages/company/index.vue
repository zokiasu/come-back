<template>
	<div class="container mx-auto space-y-6 py-10">
		<!-- Search bar -->
		<div class="flex items-center gap-2">
			<UInput
				v-model="search"
				type="text"
				placeholder="Search for a company..."
				size="lg"
				icon="i-heroicons-magnifying-glass"
				class="w-full"
			/>
			<UButton
				label="Create Company"
				class="bg-cb-primary-700/10 lg:bg-cb-primary-900 lg:hover:bg-cb-primary-900/90 h-full w-fit items-center justify-center rounded text-white lg:cursor-pointer lg:px-5"
				to="/company/create"
			/>
			<UButton
				label="Filters"
				:trailing-icon="
					filtersExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'
				"
				class="bg-cb-primary-700/10 lg:bg-cb-primary-900 lg:hover:bg-cb-primary-900/90 h-full w-fit items-center justify-center rounded text-white lg:cursor-pointer lg:px-5"
				@click="toggleFilters"
			/>
		</div>

		<!-- Section des filtres -->
		<Transition
			enter-active-class="transition-all duration-300 ease-out"
			enter-from-class="opacity-0 max-h-0 overflow-hidden"
			enter-to-class="opacity-100 max-h-96 overflow-visible"
			leave-active-class="transition-all duration-300 ease-in"
			leave-from-class="opacity-100 max-h-96 overflow-visible"
			leave-to-class="opacity-0 max-h-0 overflow-hidden"
		>
			<UCard v-show="filtersExpanded">
				<div class="space-y-6">
					<!-- Filters by type and verification status -->
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						<!-- Company type -->
						<div>
							<label class="mb-3 block text-sm font-medium text-gray-300">
								Company type
							</label>
							<div class="flex flex-wrap gap-2">
								<UButton
									v-for="type in companyTypes"
									:key="type"
									:variant="selectedType === type ? 'solid' : 'outline'"
									:color="selectedType === type ? 'primary' : 'neutral'"
									size="sm"
									:disabled="isLoading"
									:class="{ 'text-white': selectedType === type }"
									@click="selectedType = selectedType === type ? null : type"
								>
									{{ getCompanyTypeLabel(type) }}
								</UButton>
							</div>
						</div>

						<!-- Verification status -->
						<div>
							<label class="mb-3 block text-sm font-medium text-gray-300">Status</label>
							<div class="flex flex-wrap gap-2">
								<UButton
									v-for="status in verificationStatuses"
									:key="status.value"
									:variant="selectedVerified === status.value ? 'solid' : 'outline'"
									:color="selectedVerified === status.value ? 'primary' : 'neutral'"
									size="sm"
									:disabled="isLoading"
									:class="{ 'text-white': selectedVerified === status.value }"
									@click="
										selectedVerified =
											selectedVerified === status.value ? null : status.value
									"
								>
									{{ status.label }}
								</UButton>
							</div>
						</div>
					</div>

					<!-- Active filters counter and clear button -->
					<div v-if="hasActiveFilters" class="flex items-center justify-between">
						<p class="text-sm text-gray-400">{{ activeFiltersCount }} active filter(s)</p>
						<UButton
							variant="outline"
							size="xs"
							color="error"
							:disabled="isLoading"
							@click="clearAllFilters"
						>
							Clear filters
						</UButton>
					</div>
				</div>
			</UCard>
		</Transition>

		<!-- Results header -->
		<div
			v-if="!isLoading || companies.length > 0"
			class="flex items-center justify-between"
		>
			<p class="text-sm text-gray-400">{{ totalCompanies }} company(ies) found</p>
		</div>

		<!-- Companies grid -->
		<transition-group
			tag="div"
			leave-active-class="animate__bounceOut"
			enter-active-class="animate__bounceIn"
			class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
		>
			<CardCompany
				v-for="company in companies"
				:key="company.id"
				:company="company"
				class="!max-w-full !min-w-full"
			/>
		</transition-group>

		<!-- Loading state -->
		<div v-if="isLoading && companies.length === 0" class="py-8">
			<div
				class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
			>
				<SkeletonDefault
					v-for="i in 12"
					:key="i"
					class="aspect-square w-full rounded-lg"
				/>
			</div>
		</div>

		<!-- Load more / End messages -->
		<div v-if="isLoading && companies.length > 0" class="py-4 text-center">
			Loading...
		</div>
		<div v-if="!hasMore && companies.length > 0" class="py-4 text-center text-gray-400">
			All companies are displayed.
		</div>
		<div
			v-if="!isLoading && companies.length === 0"
			class="py-8 text-center text-gray-400"
		>
			No companies found.
		</div>
	</div>
</template>

<script setup lang="ts">
	import { ref, watch, onMounted, computed } from 'vue'
	import { useSupabaseCompanies } from '@/composables/Supabase/useSupabaseCompanies'
	import { useInfiniteScroll } from '@vueuse/core'
	import type { Company } from '~/composables/Supabase/useSupabaseCompanies'

	const { getAllCompanies, companyTypes } = useSupabaseCompanies()

	const companies = ref<Company[]>([])
	const search = ref('')
	const page = ref(1)
	const limit = ref(24)
	const isLoading = ref(false)
	const hasMore = ref(true)
	const totalCompanies = ref(0)

	// Filters
	const selectedType = ref<string | null>(null)
	const selectedVerified = ref<boolean | null>(null)

	// State for filter expansion
	const filtersExpanded = ref(false)

	// Verification status options
	const verificationStatuses = [
		{ value: true, label: 'Verified' },
		{ value: false, label: 'Not verified' },
	]

	const fetchCompanies = async (reset = false) => {
		if (isLoading.value || (!hasMore.value && !reset)) return
		isLoading.value = true

		const currentPage = reset ? 1 : page.value
		const offset = (currentPage - 1) * limit.value

		try {
			const result = await getAllCompanies({
				search: search.value || undefined,
				type: selectedType.value || undefined,
				verified: selectedVerified.value ?? undefined,
				limit: limit.value,
				offset: offset,
				orderBy: 'name',
				orderDirection: 'asc',
			})

			if (reset) {
				companies.value = result.companies
				page.value = 1
			} else {
				companies.value = [...companies.value, ...result.companies]
			}

			totalCompanies.value = result.total
			hasMore.value = result.companies.length === limit.value
		} catch (error) {
			console.error('Error fetching companies:', error)
		} finally {
			isLoading.value = false
		}
	}

	// Watch for filter changes
	watch([search, selectedType, selectedVerified], () => {
		page.value = 1
		hasMore.value = true
		fetchCompanies(true)
	})

	const loadMore = async () => {
		if (isLoading.value || !hasMore.value) return
		page.value++
		await fetchCompanies()
	}

	onMounted(async () => {
		await fetchCompanies(true)
	})

	useInfiniteScroll(window, loadMore, {
		distance: 200,
		canLoadMore: () => hasMore.value && !isLoading.value,
	})

	// Computed to check if there are active filters
	const hasActiveFilters = computed(() => {
		return selectedType.value !== null || selectedVerified.value !== null
	})

	// Computed to count the number of active filters
	const activeFiltersCount = computed(() => {
		let count = 0
		if (selectedType.value !== null) count++
		if (selectedVerified.value !== null) count++
		return count
	})

	// Function to clear all filters
	const clearAllFilters = () => {
		selectedType.value = null
		selectedVerified.value = null
	}

	// Function to get company type label
	const getCompanyTypeLabel = (type: string | undefined) => {
		const labels = {
			LABEL: 'Label',
			PUBLISHER: 'Publisher',
			DISTRIBUTOR: 'Distributor',
			MANAGER: 'Management',
			AGENCY: 'Agency',
			STUDIO: 'Studio',
			OTHER: 'Other',
		}
		return labels[type as keyof typeof labels] || type || 'Not specified'
	}

	// Function to format location
	const formatLocation = (city?: string, country?: string) => {
		if (city && country) return `${city}, ${country}`
		if (city) return city
		if (country) return country
		return null
	}

	// Function to toggle filter display
	const toggleFilters = () => {
		filtersExpanded.value = !filtersExpanded.value
	}

	// Set page title and meta
	useHead({
		title: 'Companies - Comeback',
		meta: [
			{
				name: 'description',
				content:
					'Discover all music companies, labels, publishers and distributors on Comeback.',
			},
		],
	})
</script>
