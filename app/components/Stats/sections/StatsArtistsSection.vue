<template>
  <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
    <StatsSectionHeader
      :title="section.title"
      :loading="loading"
      :period-display="periodDisplay"
    />

    <div v-if="section.cards?.length" class="mb-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatsCard
        v-for="card in section.cards"
        :key="card.title"
        :card="card"
      />
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="space-y-6 xl:col-span-2">
        <div
          v-for="chart in primaryCharts"
          :key="chart.title"
          class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
        >
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ chart.title }}
          </h3>
          <StatsChart :data="chart.data" :height="300" />
          <p v-if="chart.description" class="text-sm text-gray-500 dark:text-gray-400 mt-3">
            {{ chart.description }}
          </p>
        </div>
      </div>
      <div class="space-y-6">
        <div v-if="secondaryChart" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ secondaryChart.title }}
          </h3>
          <StatsChart :data="secondaryChart.data" :height="280" />
        </div>
        <div
          v-for="list in section.topLists || []"
          :key="list.title"
          class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
        >
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ list.title }}
          </h3>
          <TopList :items="list.items" :limit="list.limit" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StatSection } from '~/types/stats'

import StatsSectionHeader from '~/components/Stats/sections/StatsSectionHeader.vue'
import StatsCard from '~/components/Stats/StatsCard.vue'
import StatsChart from '~/components/Stats/StatsChart.vue'
import TopList from '~/components/Stats/TopList.vue'

interface Props {
  section: StatSection
  loading?: boolean
  periodDisplay?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  periodDisplay: undefined
})

const primaryCharts = computed(() => props.section.charts?.filter((_, index) => index !== 1) || [])
const secondaryChart = computed(() => props.section.charts?.[1])
</script>
