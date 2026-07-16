import type { DashboardStats, StatsFilters } from '~/types/stats'

export function useSupabaseStatistics() {
	const getStatistics = async (filters: StatsFilters): Promise<DashboardStats> => {
		return $fetch('/api/dashboard/stats', {
			method: 'POST',
			body: filters,
		})
	}

	return {
		getStatistics,
	}
}
