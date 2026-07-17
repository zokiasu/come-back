import type { DashboardStats, StatsFilters } from '~/types/stats'

export function useSupabaseStatistics() {
	const { requireAuthHeaders } = useApiAuthHeaders()

	const getStatistics = async (filters: StatsFilters): Promise<DashboardStats> => {
		return $fetch('/api/dashboard/stats', {
			method: 'POST',
			headers: requireAuthHeaders(),
			body: filters,
		})
	}

	return {
		getStatistics,
	}
}
