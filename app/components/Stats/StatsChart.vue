<template>
  <div
    class="w-full"
    :style="{ height: `${props.height}px` }"
  >
    <ClientOnly>
      <component
        :is="chartComponent"
        :data="chartConfig.data"
        :options="chartConfig.options"
        :height="props.height"
        class="h-full"
      />

      <template #fallback>
        <div class="h-full rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar, Line, Pie, Doughnut } from 'vue-chartjs'
import 'chart.js/auto'
import type { ChartData } from '~/types/stats'

interface Props {
  data: ChartData
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 320
})

const defaultColors = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#8B5CF6', // violet-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#6366F1', // indigo-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#84CC16', // lime-500
  '#F97316' // orange-500
]

const resolvedColors = computed<string[]>(() => {
  if (props.data.colors?.length) {
    return props.data.colors
  }

  return defaultColors.slice(0, props.data.labels.length)
})

const showLegend = computed(() => props.data.type === 'pie' || props.data.type === 'doughnut')

const chartComponent = computed(() => {
  switch (props.data.type) {
    case 'bar':
      return Bar
    case 'line':
      return Line
    case 'pie':
      return Pie
    case 'doughnut':
      return Doughnut
    default:
      return Bar
  }
})

const commonOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: showLegend.value,
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 15,
        color: 'rgb(107, 114, 128)',
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgb(31, 41, 55)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: 'rgb(75, 85, 99)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12
    }
  }
}))

const chartConfig = computed(() => {
  const colors = resolvedColors.value
  const baseData = {
    labels: props.data.labels
  }

  switch (props.data.type) {
    case 'bar':
      return {
        data: {
          ...baseData,
          datasets: [
            {
              label: 'Valeurs',
              data: props.data.data,
              backgroundColor: colors.map(color => `${color}CC`),
              borderColor: colors,
              borderWidth: 1,
              borderRadius: 4,
              borderSkipped: false
            }
          ]
        },
        options: {
          ...commonOptions.value,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgb(229, 231, 235)',
                borderColor: 'rgb(209, 213, 219)'
              },
              ticks: {
                color: 'rgb(107, 114, 128)'
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: 'rgb(107, 114, 128)'
              }
            }
          }
        }
      }
    case 'line':
      return {
        data: {
          ...baseData,
          datasets: [
            {
              label: 'Valeurs',
              data: props.data.data,
              borderColor: colors[0],
              backgroundColor: `${colors[0]}33`,
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointBackgroundColor: colors[0],
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          ...commonOptions.value,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgb(229, 231, 235)',
                borderColor: 'rgb(209, 213, 219)'
              },
              ticks: {
                color: 'rgb(107, 114, 128)'
              }
            },
            x: {
              grid: {
                color: 'rgb(229, 231, 235)',
                borderColor: 'rgb(209, 213, 219)'
              },
              ticks: {
                color: 'rgb(107, 114, 128)'
              }
            }
          }
        }
      }
    case 'doughnut':
    case 'pie':
      return {
        data: {
          ...baseData,
          datasets: [
            {
              label: 'Répartition',
              data: props.data.data,
              backgroundColor: colors,
              borderColor: '#ffffff',
              borderWidth: 2,
              hoverBorderWidth: 3
            }
          ]
        },
        options: {
          ...commonOptions.value,
          plugins: {
            ...commonOptions.value.plugins,
            legend: {
              ...commonOptions.value.plugins.legend,
              position: 'right' as const,
              display: true,
            }
          },
          cutout: props.data.type === 'doughnut' ? '60%' : '0%'
        }
      }
    default:
      return {
        data: {
          ...baseData,
          datasets: [
            {
              label: 'Valeurs',
              data: props.data.data,
              backgroundColor: colors
            }
          ]
        },
        options: commonOptions.value
      }
  }
})
</script>