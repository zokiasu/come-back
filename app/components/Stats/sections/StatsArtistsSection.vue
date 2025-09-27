<template>
	<section class="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
		<StatsSectionHeader
			:title="section.title"
			:loading="loading"
			:period-display="periodDisplay"
		/>

		<div
			v-if="section.cards?.length"
			class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
		>
			<StatsCard v-for="card in section.cards" :key="card.title" :card="card" />
		</div>

		<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
			<div class="space-y-6 xl:col-span-2">
				<div
					v-for="chart in primaryCharts"
					:key="chart.title"
					class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700"
				>
					<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">
						{{ chart.title }}
					</h3>
					<StatsChart :data="chart.data" :height="300" />
					<p
						v-if="chart.description"
						class="mt-3 text-sm text-gray-500 dark:text-gray-400"
					>
						{{ chart.description }}
					</p>
				</div>
			</div>
			<div class="space-y-6">
				<div v-if="secondaryChart" class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
					<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">
						{{ secondaryChart.title }}
					</h3>
					<StatsChart :data="secondaryChart.data" :height="280" />
				</div>
				<div
					v-for="list in section.topLists || []"
					:key="list.title"
					class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700"
				>
					<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">
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
		periodDisplay: undefined,
	})

	const primaryCharts = computed(
		() => props.section.charts?.filter((_, index) => index !== 1) || [],
	)
	const secondaryChart = computed(() => props.section.charts?.[1])
</script>
