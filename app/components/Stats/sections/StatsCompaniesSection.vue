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

    <div v-if="section.topLists?.length" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        v-for="list in section.topLists"
        :key="list.title"
        class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
      >
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {{ list.title }}
        </h3>
        <TopList :items="list.items" :limit="list.limit" />
      </div>
    </div>

    <div v-if="!section.cards?.length && !section.topLists?.length" class="text-center text-sm text-gray-500 dark:text-gray-400">
      Aucune donnée disponible pour cette période.
    </div>
  </section>
</template>

<script setup lang="ts">
import type { StatSection } from '~/types/stats'

import StatsSectionHeader from '~/components/Stats/sections/StatsSectionHeader.vue'
import StatsCard from '~/components/Stats/StatsCard.vue'
import TopList from '~/components/Stats/TopList.vue'

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
