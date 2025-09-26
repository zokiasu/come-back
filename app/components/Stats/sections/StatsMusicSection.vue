<template>
  <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
    <StatsSectionHeader
      :title="section.title"
      :loading="loading"
      :period-display="periodDisplay"
    />

    <div v-if="section.cards?.length" class="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <StatsCard
        v-for="card in section.cards"
        :key="card.title"
        :card="card"
      />
    </div>

    <div v-if="section.charts?.length" class="space-y-6">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div
          v-for="chart in section.charts"
          :key="chart.title"
          class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex flex-col"
        >
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ chart.title }}
          </h3>
          <div class="flex-1">
            <StatsChart :data="chart.data" :height="280" />
          </div>
          <p v-if="chart.description" class="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {{ chart.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { StatSection } from '~/types/stats'

import StatsSectionHeader from '~/components/Stats/sections/StatsSectionHeader.vue'
import StatsCard from '~/components/Stats/StatsCard.vue'
import StatsChart from '~/components/Stats/StatsChart.vue'

interface Props {
  section: StatSection
  loading?: boolean
  periodDisplay?: string
}

withDefaults(defineProps<Props>(), {
  loading: false,
  periodDisplay: undefined
})
</script>
