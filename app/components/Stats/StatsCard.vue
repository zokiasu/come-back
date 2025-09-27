<template>
	<div
		class="rounded-lg border border-gray-200 bg-white p-6 transition-shadow duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
		:class="cardColorClass"
	>
		<div class="flex items-center justify-between">
			<div class="flex-1">
				<div class="flex items-center space-x-3">
					<div v-if="card.icon" class="rounded-lg p-2" :class="iconColorClass">
						<Icon :name="card.icon" class="h-6 w-6 text-white" />
					</div>
					<div>
						<h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">
							{{ card.title }}
						</h3>
						<p class="text-2xl font-bold text-gray-900 dark:text-white">
							{{ formattedValue }}
						</p>
					</div>
				</div>

				<div v-if="card.subtitle" class="mt-2">
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{{ card.subtitle }}
					</p>
				</div>

				<div v-if="card.trend" class="mt-3 flex items-center space-x-2">
					<div class="flex items-center space-x-1">
						<Icon :name="trendIcon" :class="trendColorClass" class="h-4 w-4" />
						<span :class="trendColorClass" class="text-sm font-medium">
							{{ Math.abs(card.trend.value) }}%
						</span>
					</div>
					<span class="text-sm text-gray-500 dark:text-gray-400">
						{{ card.trend.period }}
					</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { StatCard } from '~/types/stats'

	interface Props {
		card: StatCard
	}

	const props = defineProps<Props>()

	const formattedValue = computed(() => {
		const { value } = props.card
		if (typeof value === 'number') {
			return value.toLocaleString('fr-FR')
		}
		return value
	})

	const cardColorClass = computed(() => {
		const { color } = props.card
		if (!color) return ''

		const colorClasses = {
			blue: 'border-l-4 border-l-blue-500',
			green: 'border-l-4 border-l-green-500',
			purple: 'border-l-4 border-l-purple-500',
			orange: 'border-l-4 border-l-orange-500',
			red: 'border-l-4 border-l-red-500',
			indigo: 'border-l-4 border-l-indigo-500',
			pink: 'border-l-4 border-l-pink-500',
			yellow: 'border-l-4 border-l-yellow-500',
		}

		return colorClasses[color] || ''
	})

	const iconColorClass = computed(() => {
		const { color } = props.card
		if (!color) return 'bg-gray-500'

		const colorClasses = {
			blue: 'bg-blue-500',
			green: 'bg-green-500',
			purple: 'bg-purple-500',
			orange: 'bg-orange-500',
			red: 'bg-red-500',
			indigo: 'bg-indigo-500',
			pink: 'bg-pink-500',
			yellow: 'bg-yellow-500',
		}

		return colorClasses[color] || 'bg-gray-500'
	})

	const trendIcon = computed(() => {
		const { trend } = props.card
		if (!trend) return ''

		switch (trend.direction) {
			case 'up':
				return 'i-heroicons-arrow-trending-up'
			case 'down':
				return 'i-heroicons-arrow-trending-down'
			default:
				return 'i-heroicons-minus'
		}
	})

	const trendColorClass = computed(() => {
		const { trend } = props.card
		if (!trend) return ''

		switch (trend.direction) {
			case 'up':
				return 'text-green-600 dark:text-green-400'
			case 'down':
				return 'text-red-600 dark:text-red-400'
			default:
				return 'text-gray-500 dark:text-gray-400'
		}
	})
</script>
