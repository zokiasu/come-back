<template>
	<section class="bg-cb-quinary-900 space-y-4 rounded-lg p-4">
		<StatsSectionHeader
			:title="section.title"
			:loading="loading"
			:period-display="periodDisplay"
		/>

		<div
			v-if="section.cards?.length"
			class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
		>
			<StatsCard v-for="card in section.cards" :key="card.title" :card="card" />
		</div>

		<div
			v-if="!section.cards?.length"
			class="text-cb-tertiary-200 py-4 text-center text-sm"
		>
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
		periodDisplay: undefined,
	})
</script>
