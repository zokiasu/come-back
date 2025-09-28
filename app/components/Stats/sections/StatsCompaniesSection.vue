<template>
	<section class="bg-cb-quinary-900 space-y-4 rounded-lg p-4">
		<StatsSectionHeader
			:title="section.title"
			:loading="loading"
			:period-display="periodDisplay"
		/>
		<div v-if="section.cards?.length || section.topLists?.length" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<div v-if="section.cards?.length">
				<StatsCard v-for="card in section.cards" :key="card.title" :card="card" />
			</div>

			<div v-if="section.topLists?.length">
				<div
					v-for="list in section.topLists"
					:key="list.title"
					class="rounded-lg bg-cb-quaternary-950 p-4"
				>
					<h3 class="mb-4 text-lg font-medium">
						{{ list.title }}
					</h3>
					<TopList :items="list.items" :limit="list.limit" />
				</div>
			</div>
		</div>
		<div
			v-if="!section.cards?.length && !section.topLists?.length"
			class="text-center text-sm opacity-70"
		>
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
		periodDisplay: undefined,
	})
</script>
