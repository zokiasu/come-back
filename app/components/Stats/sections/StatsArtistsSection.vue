<template>
	<section class="bg-cb-quinary-900 space-y-4 rounded-lg p-4">
		<StatsSectionHeader
			:title="section.title"
			:loading="loading"
			:period-display="periodDisplay"
		/>

		<div
			v-if="section.cards?.length"
			class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
		>
			<StatsCard v-for="card in section.cards" :key="card.title" :card="card" />
		</div>

		<div class="space-y-6">
			<!-- Graphique des genres musicaux -->
			<div v-if="genreChart" class="bg-cb-quaternary-950 rounded-lg p-4">
				<h3 class="mb-4 text-lg font-medium text-white">
					{{ genreChart.title }}
				</h3>
				<StatsChart :data="genreChart.data" :height="300" />
				<p v-if="genreChart.description" class="text-cb-tertiary-200 mt-3 text-sm">
					{{ genreChart.description }}
				</p>
			</div>

			<!-- Graphiques de répartition Hommes/Femmes -->
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<div
					v-for="chart in genderCharts"
					:key="chart.title"
					class="bg-cb-quaternary-950 rounded-lg p-4"
				>
					<h3 class="mb-4 text-lg font-medium text-white">
						{{ chart.title }}
					</h3>
					<StatsChart :data="chart.data" :height="280" />
					<p v-if="chart.description" class="text-cb-tertiary-200 mt-3 text-sm">
						{{ chart.description }}
					</p>
				</div>
			</div>

			<!-- Graphique qualité et top lists -->
			<div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<div v-if="qualityChart" class="bg-cb-quaternary-950 rounded-lg p-4">
					<h3 class="mb-4 text-lg font-medium text-white">
						{{ qualityChart.title }}
					</h3>
					<StatsChart :data="qualityChart.data" :height="300" />
					<p v-if="qualityChart.description" class="text-cb-tertiary-200 mt-3 text-sm">
						{{ qualityChart.description }}
					</p>
				</div>
				<div class="space-y-4 xl:col-span-2">
					<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<div
							v-for="list in section.topLists || []"
							:key="list.title"
							class="bg-cb-quaternary-950 rounded-lg p-4"
						>
							<h3 class="mb-4 text-lg font-medium text-white">
								{{ list.title }}
							</h3>
							<TopList :items="list.items" :limit="list.limit" />
						</div>
					</div>
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

	const genreChart = computed(() => props.section.charts?.[0])
	const genderCharts = computed(() => props.section.charts?.slice(1, 4) || [])
	const qualityChart = computed(() => props.section.charts?.[4])
</script>
