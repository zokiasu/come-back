<template>
  <div class="space-y-3">
    <div
      v-for="(item, index) in displayedItems"
      :key="item.id"
      class="flex items-center space-x-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow duration-200"
    >
      <!-- Ranking Number -->
      <div class="flex-shrink-0">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
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
          class="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
        />
      </div>

      <!-- Item Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
              {{ item.name }}
            </p>
            <p v-if="item.subtitle" class="text-sm text-gray-500 dark:text-gray-400 truncate">
              {{ item.subtitle }}
            </p>
          </div>
          <div class="flex-shrink-0 ml-4">
            <span class="inline-flex items-center space-x-1">
              <span class="text-lg font-bold text-gray-900 dark:text-white">
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
        @click="toggleShowAll"
        class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        {{ showingAll ? 'Voir moins' : `Voir ${items.length - displayLimit} de plus` }}
        <Icon
          :name="showingAll ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="w-4 h-4 ml-1"
        />
      </UButton>
    </div>

    <!-- Empty State -->
    <div v-if="items.length === 0" class="text-center py-8">
      <div class="text-gray-400 dark:text-gray-500 mb-2">
        <Icon name="i-heroicons-list-bullet" class="w-8 h-8 mx-auto" />
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Aucun élément à afficher
      </p>
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
  limit: 10
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
    return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700'
  }
  if (index === 1) {
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
  }
  if (index === 2) {
    return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border border-orange-300 dark:border-orange-700'
  }
  return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
}

const formatValue = (value: number) => {
  return value.toLocaleString('fr-FR')
}
</script>