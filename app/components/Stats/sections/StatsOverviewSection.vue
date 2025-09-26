<template>
  <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
    <StatsSectionHeader
      :title="section.title"
      :loading="loading"
      :period-display="periodDisplay"
    />

    <div v-if="section.cards?.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        v-for="card in section.cards"
        :key="card.title"
        :card="card"
      />
    </div>

    <div v-if="!section.cards?.length" class="text-sm text-gray-500 dark:text-gray-400">
      Aucune donnée disponible pour cette période.
    </div>
  </section>
</template>

<script setup lang="ts">
import type { StatSection } from '~/types/stats'

import StatsSectionHeader from '~/components/Stats/sections/StatsSectionHeader.vue'
import StatsCard from '~/components/Stats/StatsCard.vue'

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
