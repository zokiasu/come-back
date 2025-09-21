<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Tableau de Bord des Statistiques
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          Vue d'ensemble des données de la plateforme Comeback
        </p>
      </div>

      <!-- Filtres temporels -->
      <div class="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Filtres</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              @click="refreshStats"
              :loading="loading"
              variant="solid"
              color="primary"
            >
              Actualiser
            </UButton>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <LoadingIndicator size="lg" />
      </div>

      <!-- Stats Grid -->
      <div v-else class="space-y-8">
        <!-- Vue d'ensemble -->
        <StatsSection
          :section="generalStats"
          :loading="loading"
          :period-display="currentPeriodDisplay"
        />

        <!-- Statistiques par Artistes -->
        <StatsSection
          :section="artistStats"
          :loading="loading"
          :period-display="currentPeriodDisplay"
        />

        <!-- Statistiques des Companies -->
        <StatsSection
          :section="companyStats"
          :loading="loading"
          :period-display="currentPeriodDisplay"
        />

        <!-- Statistiques Musicales -->
        <StatsSection
          :section="musicStats"
          :loading="loading"
          :period-display="currentPeriodDisplay"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSupabaseStatistics } from '~/composables/Supabase/useSupabaseStatistics'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'admin'
})

const { getStatistics } = useSupabaseStatistics()

// Reactive data
const loading = ref(false)
const selectedPeriod = ref('all')
const selectedYear = ref(null)
const selectedMonth = ref(null)

// Options pour les filtres
const periodOptions = [
  { value: 'all', label: 'Toute la période' },
  { value: 'year', label: 'Cette année' },
  { value: 'month', label: 'Ce mois' },
  { value: 'week', label: 'Cette semaine' }
]

const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let year = currentYear; year >= 2020; year--) {
    years.push({ value: year, label: year.toString() })
  }
  return [{ value: null, label: 'Toutes les années' }, ...years]
})

const monthOptions = computed(() => {
  const months = [
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
    { value: 11, label: 'Décembre' }
  ]
  return months
})

// Affichage de la période actuelle
const currentPeriodDisplay = computed(() => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  if (selectedPeriod.value === 'all' && !selectedYear.value) {
    return 'Toutes les données disponibles'
  }

  if (selectedYear.value) {
    if (selectedPeriod.value === 'month' && selectedMonth.value !== null) {
      const monthName = monthOptions.value.find(m => m.value === selectedMonth.value)?.label
      return `${monthName} ${selectedYear.value}`
    } else if (selectedPeriod.value === 'year' || selectedPeriod.value === 'all') {
      return `Année ${selectedYear.value}`
    }
  }

  switch (selectedPeriod.value) {
    case 'week':
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return `Du ${oneWeekAgo.toLocaleDateString('fr-FR')} au ${now.toLocaleDateString('fr-FR')}`
    case 'month':
      if (selectedMonth.value !== null) {
        const monthName = monthOptions.value.find(m => m.value === selectedMonth.value)?.label
        return `${monthName} ${currentYear} (mois spécifique)`
      } else {
        const monthName = monthOptions.value.find(m => m.value === currentMonth)?.label
        return `${monthName} ${currentYear} (en cours)`
      }
    case 'year':
      return `${currentYear} (en cours)`
    default:
      return 'Toutes les données disponibles'
  }
})

// Stats data
const generalStats = ref({})
const artistStats = ref({})
const companyStats = ref({})
const musicStats = ref({})

// Méthodes
const refreshStats = async () => {
  loading.value = true
  try {
    const filters = {
      period: selectedPeriod.value,
      year: selectedYear.value,
      month: selectedMonth.value
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
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}

// Watchers
watch([selectedPeriod], ([newPeriod]) => {
  // Réinitialiser le mois seulement si on change de période et que ce n'est plus 'month'
  if (newPeriod !== 'month') {
    selectedMonth.value = null
  }
})

// Lifecycle
onMounted(() => {
  refreshStats()
})

// SEO
useSeoMeta({
  title: 'Statistiques - Admin - Comeback',
  description: 'Tableau de bord des statistiques de la plateforme Comeback'
})
</script>