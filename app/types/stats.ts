export interface StatCard {
	title: string
	value: number | string
	subtitle?: string
	trend?: {
		value: number
		direction: 'up' | 'down' | 'neutral'
		period: string
	}
	icon?: string
	color?: string
}

export interface ChartData {
	labels: string[]
	data: number[]
	colors?: string[]
	type: 'bar' | 'pie' | 'line' | 'doughnut'
}

export interface TopListItem {
	id: string
	name: string
	image?: string
	badge?: string
	subtitle?: string
	value: number | string
}

export interface StatSection {
	title: string
	cards?: StatCard[]
	charts?: Array<{
		title: string
		data: ChartData
		description?: string
		layout?: 'full' | 'half'
	}>
	topLists?: Array<{
		title: string
		items: TopListItem[]
		limit?: number
	}>
}

export interface StatsFilters {
	period: 'all' | 'year' | 'month' | 'week'
	year?: number | null
	month?: number | null
	startDate?: Date
	endDate?: Date
}

// Primary interface for all statistics
export interface DashboardStats {
	general: StatSection
	artists: StatSection
	companies: StatSection
	music: StatSection
}
