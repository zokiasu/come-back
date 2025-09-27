<template>
	<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
		<div class="container mx-auto px-4 py-8">
			<div class="mb-8">
				<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
					Tableau de Bord des Statistiques
				</h1>
				<p class="text-gray-600 dark:text-gray-300">
					Vue d'ensemble des données de la plateforme Comeback
				</p>
			</div>

			<!-- Filtres temporels -->
			<div class="mb-8 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Filtres</h2>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
					<div>
						<label
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Période
						</label>
						<USelect
							v-model="selectedPeriod"
							:items="periodOptions"
							placeholder="Sélectionner une période"
							@change="refreshStats"
						/>
					</div>
					<div>
						<label
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Année
						</label>
						<USelect
							v-model="selectedYear"
							:items="yearOptions"
							placeholder="Toutes les années"
							@change="refreshStats"
						/>
					</div>
					<div>
						<label
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Mois
						</label>
						<USelect
							v-model="selectedMonth"
							:items="monthOptions"
							placeholder="Tous les mois"
							:disabled="selectedPeriod !== 'month'"
							@change="refreshStats"
						/>
					</div>
					<div class="flex items-end">
						<UButton
							:loading="loading"
							variant="solid"
							color="primary"
							@click="refreshStats"
						>
							Actualiser
						</UButton>
					</div>
				</div>
			</div>

			<div v-if="loading" class="py-12 text-center">
				<LoadingIndicator size="lg" />
			</div>

			<!-- Stats Grid -->
			<div v-else class="space-y-8">
				<StatsOverviewSection
					:section="generalStats"
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

				<StatsMusicSection
					:section="musicStats"
					:loading="loading"
					:period-display="currentPeriodDisplay"
				/>
			</div>
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
	import LoadingIndicator from '~/components/LoadingIndicator.vue'
	import type { StatSection, StatsFilters } from '~/types/stats'

	definePageMeta({
		middleware: ['auth', 'admin'],
		layout: 'admin',
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
