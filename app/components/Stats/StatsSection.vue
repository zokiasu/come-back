<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
    <div class="flex items-start justify-between mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
        {{ section.title }}
      </h2>
      <div class="flex items-center space-x-3">
        <!-- Period Indicator -->
        <div v-if="periodDisplay" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5">
          <div class="flex items-center space-x-2">
            <UIcon name="i-heroicons-calendar-days" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p class="text-sm text-blue-700 dark:text-blue-300">
              {{ periodDisplay }}
            </p>
          </div>
        </div>
        <!-- Loading Indicator -->
        <div v-if="loading" class="flex items-center space-x-2">
          <LoadingIndicator size="sm" />
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Chargement...
          </span>
        </div>
      </div>
    </div>

    <!-- Cards -->
    <div v-if="section.cards && section.cards.length > 0" class="mb-8">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          v-for="card in section.cards"
          :key="card.title"
          :card="card"
        />
      </div>
    </div>

    <!-- Charts and Lists Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Charts -->
      <div v-if="section.charts && section.charts.length > 0" class="space-y-6">
        <div
          v-for="chart in section.charts"
          :key="chart.title"
          class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
        >
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ chart.title }}
          </h3>
          <StatsChart
            :data="chart.data"
            :height="300"
          />
          <p v-if="chart.description" class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {{ chart.description }}
          </p>
        </div>
      </div>

      <!-- Top Lists -->
      <div v-if="section.topLists && section.topLists.length > 0" class="space-y-6">
        <div
          v-for="list in section.topLists"
          :key="list.title"
          class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
        >
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ list.title }}
          </h3>
          <TopList
            :items="list.items"
            :limit="list.limit"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="isEmpty && !loading" class="text-center py-12">
      <div class="text-gray-400 dark:text-gray-500 mb-2">
        <Icon name="i-heroicons-chart-bar" class="w-12 h-12 mx-auto" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Aucune donnée disponible
      </h3>
      <p class="text-gray-500 dark:text-gray-400">
        Les statistiques pour cette section ne sont pas encore disponibles.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StatSection } from '~/types/stats'

// Imports explicites pour Nuxt 4 + Nuxt UI 3.3.4
import StatsCard from '~/components/Stats/StatsCard.vue'
import StatsChart from '~/components/Stats/StatsChart.vue'
import TopList from '~/components/Stats/TopList.vue'
import LoadingIndicator from '~/components/LoadingIndicator.vue'

interface Props {
  section: StatSection
  loading?: boolean
  periodDisplay?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  periodDisplay: undefined
})

const isEmpty = computed(() => {
  const { section } = props
  return (
    (!section.cards || section.cards.length === 0) &&
    (!section.charts || section.charts.length === 0) &&
    (!section.topLists || section.topLists.length === 0)
  )
})
</script>