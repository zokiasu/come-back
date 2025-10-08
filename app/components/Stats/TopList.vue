<template>
	<div class="space-y-3">
		<div
			v-for="(item, index) in displayedItems"
			:key="item.id"
			class="bg-cb-quaternary-900 hover:bg-cb-quaternary-850 flex items-center space-x-4 rounded-lg p-3 transition-colors duration-200"
		>
			<!-- Ranking Number -->
			<div class="flex-shrink-0">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
					:class="getRankingClass(index)"
				>
					{{ index + 1 }}
				</div>
			</div>

			<!-- Item Image -->
			<div v-if="item.image" class="flex-shrink-0">
				<img
					:src="item.image"
					:alt="item.name"
					class="border-cb-tertiary-200 h-10 w-10 rounded-full border-2 object-cover"
				/>
			</div>

			<!-- Item Content -->
			<div class="min-w-0 flex-1">
				<div class="flex items-center justify-between">
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-white">
							{{ item.name }}
						</p>
						<p v-if="item.subtitle" class="text-cb-tertiary-200 truncate text-sm">
							{{ item.subtitle }}
						</p>
					</div>
					<div class="ml-4 flex-shrink-0">
						<span class="inline-flex items-center space-x-1">
							<span class="text-lg font-bold text-white">
								{{ formatValue(item.value) }}
							</span>
							<span v-if="item.badge" class="ml-2">
								<UBadge :label="item.badge" size="xs" />
							</span>
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Show More Button -->
		<div v-if="canShowMore" class="text-center">
			<UButton
				variant="ghost"
				size="sm"
				class="text-cb-tertiary-200 hover:text-white"
				@click="toggleShowAll"
			>
				{{ showingAll ? 'Voir moins' : `Voir ${items.length - displayLimit} de plus` }}
				<Icon
					:name="showingAll ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
					class="ml-1 h-4 w-4"
				/>
			</UButton>
		</div>

		<!-- Empty State -->
		<div v-if="items.length === 0" class="py-8 text-center">
			<div class="text-cb-tertiary-200 mb-2">
				<Icon name="i-heroicons-list-bullet" class="mx-auto h-8 w-8" />
			</div>
			<p class="text-cb-tertiary-200 text-sm">Aucun élément à afficher</p>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { TopListItem } from '~/types/stats'

	interface Props {
		items: TopListItem[]
		limit?: number
	}

	const props = withDefaults(defineProps<Props>(), {
		limit: 10,
	})

	const showingAll = ref(false)
	const displayLimit = computed(() => props.limit || 10)

	const displayedItems = computed(() => {
		if (showingAll.value || props.items.length <= displayLimit.value) {
			return props.items
		}
		return props.items.slice(0, displayLimit.value)
	})

	const canShowMore = computed(() => {
		return props.items.length > displayLimit.value
	})

	const toggleShowAll = () => {
		showingAll.value = !showingAll.value
	}

	const getRankingClass = (index: number) => {
		if (index === 0) {
			return 'bg-yellow-500 text-yellow-900 border border-yellow-400'
		}
		if (index === 1) {
			return 'bg-gray-400 text-gray-900 border border-gray-300'
		}
		if (index === 2) {
			return 'bg-orange-500 text-orange-900 border border-orange-400'
		}
		return 'bg-cb-primary-900 text-white border border-cb-primary-800'
	}

	const formatValue = (value: number | string) => {
		if (typeof value === 'number') {
			return value.toLocaleString('fr-FR')
		}
		return value
	}
</script>
