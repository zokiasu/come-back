<template>
	<div class="relative h-full space-y-3 overflow-y-auto">
		<!-- Header Section -->
		<section class="sticky top-0 z-20 w-full space-y-4 p-6 bg-cb-secondary-950">
			<div class="space-y-2">
				<h1 class="text-2xl font-bold text-white">Tableau de Bord des Statistiques</h1>
				<p class="text-cb-tertiary-200 text-sm">
					{{ currentPeriodDisplay }}
				</p>
			</div>

			<!-- Filtres temporels -->
			<div class="bg-cb-quinary-900 space-y-4 rounded-lg p-4">
				<h2 class="text-sm font-semibold text-white uppercase">Filtres</h2>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div class="space-y-1">
						<label class="text-cb-tertiary-200 text-xs uppercase">Période</label>
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
						<label class="text-cb-tertiary-200 text-xs uppercase">Année</label>
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
						<label class="text-cb-tertiary-200 text-xs uppercase">Mois</label>
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
							<span v-if="loading">Actualisation...</span>
							<span v-else>Actualiser</span>
						</button>
					</div>
				</div>
			</div>
		</section>

		<!-- Loading State -->
		<div v-if="loading" class="bg-cb-quaternary-950 rounded-lg p-8 mx-6">
			<div class="flex flex-col items-center space-y-4">
				<div
					class="border-cb-primary-900 h-8 w-8 animate-spin rounded-full border-b-2"
				></div>
				<p class="text-cb-tertiary-200 text-sm">Chargement des statistiques...</p>
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
	import { useToast } from '#imports'
	import { useSupabaseStatistics } from '~/composables/Supabase/useSupabaseStatistics'
	import StatsOverviewSection from '~/components/Stats/sections/StatsOverviewSection.vue'
	import StatsArtistsSection from '~/components/Stats/sections/StatsArtistsSection.vue'
	import StatsCompaniesSection from '~/components/Stats/sections/StatsCompaniesSection.vue'
	import StatsMusicSection from '~/components/Stats/sections/StatsMusicSection.vue'
	import type { StatSection, StatsFilters } from '~/types/stats'

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
	})

	const { getStatistics } = useSupabaseStatistics()

	const loading = ref(false)
	const selectedPeriod = ref<StatsFilters['period']>('all')
	const selectedYear = ref<number | null>(null)
	const selectedMonth = ref<number | null>(null)

	const periodOptions = [
		{ value: 'all', label: 'Toute la période' },
		{ value: 'year', label: 'Cette année' },
		{ value: 'month', label: 'Ce mois' },
		{ value: 'week', label: 'Cette semaine' },
	]

	const yearOptions = computed(() => {
		const currentYear = new Date().getFullYear()
		const years: Array<{ value: number; label: string }> = []
		for (let year = currentYear; year >= 2020; year--) {
			years.push({ value: year, label: year.toString() })
		}
		return [{ value: null, label: 'Toutes les années' }, ...years]
	})

	const monthOptions = computed(() => [
		{ value: null, label: 'Tous les mois' },
		{ value: 0, label: 'Janvier' },
		{ value: 1, label: 'Février' },
		{ value: 2, label: 'Mars' },
		{ value: 3, label: 'Avril' },
		{ value: 4, label: 'Mai' },
		{ value: 5, label: 'Juin' },
		{ value: 6, label: 'Juillet' },
		{ value: 7, label: 'Août' },
		{ value: 8, label: 'Septembre' },
		{ value: 9, label: 'Octobre' },
		{ value: 10, label: 'Novembre' },
		{ value: 11, label: 'Décembre' },
	])

	const currentPeriodDisplay = computed(() => {
		const now = new Date()
		const currentYear = now.getFullYear()
		const currentMonth = now.getMonth()

		if (selectedPeriod.value === 'all' && !selectedYear.value) {
			return 'Toutes les données disponibles'
		}

		if (selectedYear.value) {
			if (selectedPeriod.value === 'month' && selectedMonth.value !== null) {
				const monthName = monthOptions.value.find(
					(m) => m.value === selectedMonth.value,
				)?.label
				return `${monthName} ${selectedYear.value}`
			}

			if (selectedPeriod.value === 'year' || selectedPeriod.value === 'all') {
				return `Année ${selectedYear.value}`
			}
		}

		switch (selectedPeriod.value) {
			case 'week': {
				const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
				return `Du ${oneWeekAgo.toLocaleDateString('fr-FR')} au ${now.toLocaleDateString('fr-FR')}`
			}
			case 'month': {
				if (selectedMonth.value !== null) {
					const monthName = monthOptions.value.find(
						(m) => m.value === selectedMonth.value,
					)?.label
					return `${monthName} ${currentYear} (mois spécifique)`
				}
				const monthName = monthOptions.value.find((m) => m.value === currentMonth)?.label
				return `${monthName} ${currentYear} (en cours)`
			}
			case 'year':
				return `${currentYear} (en cours)`
			default:
				return 'Toutes les données disponibles'
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
			console.error('Erreur lors du chargement des statistiques:', error)
			const toast = useToast()
			toast.add({
				title: 'Erreur',
				description: 'Impossible de charger les statistiques',
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
		title: 'Statistiques - Admin - Comeback',
		description: 'Tableau de bord des statistiques de la plateforme Comeback',
	})
</script>
