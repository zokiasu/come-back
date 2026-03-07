<template>
	<div class="relative h-full space-y-3 overflow-y-auto">
		<!-- Header Section -->
		<section class="bg-cb-secondary-950 sticky top-0 z-20 w-full space-y-4 p-6">
			<div class="space-y-2">
				<h1 class="text-2xl font-bold text-white">Statistics dashboard</h1>
				<p class="text-cb-tertiary-200 text-sm">
					{{ currentPeriodDisplay }}
				</p>
			</div>

			<!-- Time filters -->
			<div class="bg-cb-quinary-900 space-y-4 rounded-lg p-4">
				<h2 class="text-sm font-semibold text-white uppercase">Filters</h2>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div class="space-y-1">
						<label class="text-cb-tertiary-200 text-xs uppercase">Period</label>
						<select
							v-model="selectedPeriod"
							class="bg-cb-quaternary-950 placeholder-cb-tertiary-200 hover:bg-cb-tertiary-200 hover:text-cb-quinary-900 w-full rounded border-none p-2 text-xs transition-all duration-300 ease-in-out focus:outline-none"
							@change="refreshStats"
						>
							<option
								v-for="option in periodOptions"
								:key="option.value"
								:value="option.value"
							>
								{{ option.label }}
							</option>
						</select>
					</div>
					<div class="space-y-1">
						<label class="text-cb-tertiary-200 text-xs uppercase">Year</label>
						<select
							v-model="selectedYear"
							class="bg-cb-quaternary-950 placeholder-cb-tertiary-200 hover:bg-cb-tertiary-200 hover:text-cb-quinary-900 w-full rounded border-none p-2 text-xs transition-all duration-300 ease-in-out focus:outline-none"
							@change="refreshStats"
						>
							<option
								v-for="option in yearOptions"
								:key="option.value ?? ''"
								:value="option.value ?? undefined"
							>
								{{ option.label }}
							</option>
						</select>
					</div>
					<div class="space-y-1">
						<label class="text-cb-tertiary-200 text-xs uppercase">Month</label>
						<select
							v-model="selectedMonth"
							:disabled="selectedPeriod !== 'month'"
							class="bg-cb-quaternary-950 placeholder-cb-tertiary-200 hover:bg-cb-tertiary-200 hover:text-cb-quinary-900 w-full rounded border-none p-2 text-xs transition-all duration-300 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							@change="refreshStats"
						>
							<option
								v-for="option in monthOptions"
								:key="option.value ?? ''"
								:value="option.value ?? undefined"
							>
								{{ option.label }}
							</option>
						</select>
					</div>
					<div class="flex items-end">
						<button
							:disabled="loading"
							class="bg-cb-primary-900 hover:bg-cb-primary-800 w-full rounded px-3 py-2 text-xs font-medium text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
							@click="refreshStats"
						>
							<span v-if="loading">Refreshing...</span>
							<span v-else>Refresh</span>
						</button>
					</div>
				</div>
			</div>
		</section>

		<!-- Loading State -->
		<div v-if="loading" class="bg-cb-quaternary-950 mx-6 rounded-lg p-8">
			<div class="flex flex-col items-center space-y-4">
				<div
					class="border-cb-primary-900 h-8 w-8 animate-spin rounded-full border-b-2"
				></div>
				<p class="text-cb-tertiary-200 text-sm">Loading statistics...</p>
			</div>
		</div>

		<!-- Stats Grid -->
		<div v-else class="space-y-6 px-6 pb-6">
			<StatsOverviewSection
				:section="generalStats"
				:loading="loading"
				:period-display="currentPeriodDisplay"
			/>

			<StatsMusicSection
				:section="musicStats"
				:loading="loading"
				:period-display="currentPeriodDisplay"
			/>

			<StatsArtistsSection
				:section="artistStats"
				:loading="loading"
				:period-display="currentPeriodDisplay"
			/>

			<StatsCompaniesSection
				:section="companyStats"
				:loading="loading"
				:period-display="currentPeriodDisplay"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref, watch } from 'vue'
	import { useSupabaseStatistics } from '~/composables/Supabase/useSupabaseStatistics'
	import StatsOverviewSection from '~/components/Stats/sections/StatsOverviewSection.vue'
	import StatsArtistsSection from '~/components/Stats/sections/StatsArtistsSection.vue'
	import StatsCompaniesSection from '~/components/Stats/sections/StatsCompaniesSection.vue'
	import StatsMusicSection from '~/components/Stats/sections/StatsMusicSection.vue'
	import type { StatSection, StatsFilters } from '~/types/stats'

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
		ssr: false, // Admin dashboard in SPA mode
	})

	const { getStatistics } = useSupabaseStatistics()

	const loading = ref(false)
	const selectedPeriod = ref<StatsFilters['period']>('all')
	const selectedYear = ref<number | null>(null)
	const selectedMonth = ref<number | null>(null)

	const periodOptions = [
		{ value: 'all', label: 'All time' },
		{ value: 'year', label: 'This year' },
		{ value: 'month', label: 'This month' },
		{ value: 'week', label: 'This week' },
	]

	const yearOptions = computed(() => {
		const currentYear = new Date().getFullYear()
		const years: Array<{ value: number; label: string }> = []
		for (let year = currentYear; year >= 2020; year--) {
			years.push({ value: year, label: year.toString() })
		}
		return [{ value: null, label: 'All years' }, ...years]
	})

	const monthOptions = computed(() => [
		{ value: null, label: 'All months' },
		{ value: 0, label: 'January' },
		{ value: 1, label: 'February' },
		{ value: 2, label: 'March' },
		{ value: 3, label: 'April' },
		{ value: 4, label: 'May' },
		{ value: 5, label: 'June' },
		{ value: 6, label: 'July' },
		{ value: 7, label: 'August' },
		{ value: 8, label: 'September' },
		{ value: 9, label: 'October' },
		{ value: 10, label: 'November' },
		{ value: 11, label: 'December' },
	])

	const currentPeriodDisplay = computed(() => {
		const now = new Date()
		const currentYear = now.getFullYear()
		const currentMonth = now.getMonth()

		if (selectedPeriod.value === 'all' && !selectedYear.value) {
			return 'All available data'
		}

		if (selectedYear.value) {
			if (selectedPeriod.value === 'month' && selectedMonth.value !== null) {
				const monthName = monthOptions.value.find(
					(m) => m.value === selectedMonth.value,
				)?.label
				return `${monthName} ${selectedYear.value}`
			}

			if (selectedPeriod.value === 'year' || selectedPeriod.value === 'all') {
				return `Year ${selectedYear.value}`
			}
		}

		switch (selectedPeriod.value) {
			case 'week': {
				const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
				return `From ${oneWeekAgo.toLocaleDateString('sv-SE')} to ${now.toLocaleDateString('sv-SE')}`
			}
			case 'month': {
				if (selectedMonth.value !== null) {
					const monthName = monthOptions.value.find(
						(m) => m.value === selectedMonth.value,
					)?.label
				return `${monthName} ${currentYear} (specific month)`
				}
				const monthName = monthOptions.value.find((m) => m.value === currentMonth)?.label
				return `${monthName} ${currentYear} (current)`
			}
			case 'year':
				return `${currentYear} (current)`
			default:
				return 'All available data'
		}
	})

	const createEmptySection = (): StatSection => ({
		title: '',
		cards: [],
		charts: [],
		topLists: [],
	})

	const generalStats = ref<StatSection>(createEmptySection())
	const artistStats = ref<StatSection>(createEmptySection())
	const companyStats = ref<StatSection>(createEmptySection())
	const musicStats = ref<StatSection>(createEmptySection())

	const refreshStats = async () => {
		loading.value = true
		try {
			const filters: StatsFilters = {
				period: selectedPeriod.value,
				year: selectedYear.value,
				month: selectedMonth.value,
			}

			const stats = await getStatistics(filters)
			generalStats.value = stats.general
			artistStats.value = stats.artists
			companyStats.value = stats.companies
			musicStats.value = stats.music
		} catch (error) {
			console.error('Error while loading statistics:', error)
			const toast = useToast()
			toast.add({
				title: 'Error',
				description: 'Unable to load statistics',
				color: 'error',
			})
		} finally {
			loading.value = false
		}
	}

	watch(selectedPeriod, (newPeriod) => {
		if (newPeriod !== 'month') {
			selectedMonth.value = null
		}
	})

	onMounted(() => {
		refreshStats()
	})

	useSeoMeta({
		title: 'Statistics - Admin - Comeback',
		description: 'Statistics dashboard for the Comeback platform',
	})
</script>
