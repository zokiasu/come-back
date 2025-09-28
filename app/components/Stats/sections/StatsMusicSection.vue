<template>
	<section class="bg-cb-quinary-900 space-y-4 rounded-lg p-4">
		<StatsSectionHeader
			:title="section.title"
			:loading="loading"
			:period-display="periodDisplay"
		/>

		<div v-if="section.cards?.length" class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
			<StatsCard v-for="card in section.cards" :key="card.title" :card="card" />
		</div>

		<div v-if="section.charts?.length" class="space-y-6">
			<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
				<div
					v-for="chart in section.charts"
					:key="chart.title"
					class="flex flex-col rounded-lg bg-gray-50 p-4 dark:bg-gray-700"
				>
					<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">
						{{ chart.title }}
					</h3>
					<div class="flex-1">
						<StatsChart :data="chart.data" :height="280" />
					</div>
					<p
						v-if="chart.description"
						class="mt-4 text-sm text-gray-500 dark:text-gray-400"
					>
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
		periodDisplay: undefined,
	})
</script>
