<template>
  <div class="w-full">
    <canvas
      ref="chartCanvas"
      :width="width"
      :height="height"
      class="max-w-full"
    />
  </div>
</template>

<script setup lang="ts">
import type { ChartData } from '~/types/stats'

interface Props {
  data: ChartData
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 400,
  height: 300
})

const chartCanvas = ref<HTMLCanvasElement>()
let chartInstance: any = null

// Couleurs par défaut pour les graphiques
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
  '#F97316', // orange-500
]

const getChartColors = () => {
  return props.data.colors || defaultColors.slice(0, props.data.data.length)
}

const createChart = async () => {
  if (!chartCanvas.value) return

  // Import Chart.js dynamically
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  // Détruire l'ancien graphique s'il existe
  if (chartInstance) {
    chartInstance.destroy()
  }

  const colors = getChartColors()

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          color: 'rgb(107, 114, 128)', // gray-500
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgb(31, 41, 55)', // gray-800
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(75, 85, 99)', // gray-600
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12
      }
    }
  }

  let chartConfig: any = {
    type: props.data.type,
    data: {
      labels: props.data.labels,
      datasets: []
    },
    options: commonOptions
  }

  switch (props.data.type) {
    case 'bar':
      chartConfig.data.datasets = [{
        data: props.data.data,
        backgroundColor: colors.map(color => `${color}CC`), // Ajout de transparence
        borderColor: colors,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false
      }]
      chartConfig.options.scales = {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgb(229, 231, 235)', // gray-200
            borderColor: 'rgb(209, 213, 219)' // gray-300
          },
          ticks: {
            color: 'rgb(107, 114, 128)' // gray-500
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgb(107, 114, 128)' // gray-500
          }
        }
      }
      break

    case 'line':
      chartConfig.data.datasets = [{
        data: props.data.data,
        borderColor: colors[0],
        backgroundColor: `${colors[0]}20`, // Transparence pour le fill
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: colors[0],
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
      chartConfig.options.scales = {
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
      break

    case 'pie':
    case 'doughnut':
      chartConfig.data.datasets = [{
        data: props.data.data,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 3
      }]
      chartConfig.options.cutout = props.data.type === 'doughnut' ? '60%' : 0
      chartConfig.options.plugins.legend.position = 'right'
      break
  }

  chartInstance = new Chart(ctx, chartConfig)
}

const updateChart = () => {
  if (!chartInstance) {
    createChart()
    return
  }

  const colors = getChartColors()

  // Mise à jour des données
  chartInstance.data.labels = props.data.labels
  chartInstance.data.datasets[0].data = props.data.data

  // Mise à jour des couleurs selon le type de graphique
  switch (props.data.type) {
    case 'bar':
      chartInstance.data.datasets[0].backgroundColor = colors.map(color => `${color}CC`)
      chartInstance.data.datasets[0].borderColor = colors
      break
    case 'line':
      chartInstance.data.datasets[0].borderColor = colors[0]
      chartInstance.data.datasets[0].backgroundColor = `${colors[0]}20`
      chartInstance.data.datasets[0].pointBackgroundColor = colors[0]
      break
    case 'pie':
    case 'doughnut':
      chartInstance.data.datasets[0].backgroundColor = colors
      break
  }

  chartInstance.update()
}

// Lifecycle
onMounted(() => {
  createChart()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})

// Watchers
watch(() => props.data, () => {
  nextTick(() => {
    updateChart()
  })
}, { deep: true })

// Handle dark mode changes
const colorMode = useColorMode()
watch(() => colorMode.value, () => {
  nextTick(() => {
    createChart()
  })
})
</script>